import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium } from 'playwright-extra';
import type { BrowserContext } from 'playwright';
import { BrowserProfile, FingerprintService } from '../anti-detection/fingerprint/fingerprint.service';
import { ProxyConfig } from '../proxy/proxy-rotator.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
// Playwright's native `userAgent` context option handles UA spoofing correctly.
// The stealth plugin's own override intercepts that and replaces it with the
// real browser UA — disable it so our profile UA is preserved.
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

@Injectable()
export class BrowserFactoryService implements OnModuleInit {
  private readonly logger = new Logger(BrowserFactoryService.name);
  private readonly headless: boolean;
  private readonly timeout: number;

  constructor(
    private readonly config: ConfigService,
    private readonly fingerprintService: FingerprintService,
  ) {
    this.headless = config.get('PLAYWRIGHT_HEADLESS', 'true') === 'true';
    this.timeout = Number(config.get('PLAYWRIGHT_TIMEOUT', '30000'));
  }

  onModuleInit(): void {
    this.logger.log(`Browser factory ready — headless: ${this.headless}`);
  }

  async createContext(proxy: ProxyConfig | null): Promise<{ context: BrowserContext; profile: BrowserProfile; userDataDir: string }> {
    const profile = this.fingerprintService.generateProfile();
    const userDataDir = path.join(os.tmpdir(), `pw-profile-${crypto.randomBytes(8).toString('hex')}`);

    const launchOptions: Parameters<typeof chromium.launchPersistentContext>[1] = {
      headless: this.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${profile.viewport.width},${profile.viewport.height}`,
      ],
      userAgent: profile.userAgent,
      viewport: profile.viewport,
      locale: profile.locale,
      timezoneId: profile.timezone,
      colorScheme: 'light',
      // Service-worker requests bypass context.route — block SWs so the SSRF
      // navigation guard sees every request.
      serviceWorkers: 'block',
      extraHTTPHeaders: {
        'Accept-Language': profile.locale,
        'sec-ch-ua': this.fingerprintService.buildSecChUa(profile.userAgent),
        'sec-ch-ua-platform': `"${profile.platform}"`,
        'sec-ch-ua-mobile': '?0',
      },
    };

    if (proxy) {
      launchOptions.proxy = {
        server: proxy.url,
        username: proxy.user,
        password: proxy.pass,
      };
    }

    const context = await chromium.launchPersistentContext(userDataDir, launchOptions);
    context.setDefaultTimeout(this.timeout);

    // Override navigator.userAgentData so Client Hints (brands, platform, version)
    // match the spoofed UA.  We use a getter — not a value — so it survives any prior
    // Object.defineProperty calls that set writable:false on the property.
    const chromeMajor = this.fingerprintService.extractChromeMajor(profile.userAgent);
    const uaPlatform = profile.platform.startsWith('Win') ? 'Windows' : profile.platform === 'MacIntel' ? 'macOS' : 'Linux';
    await context.addInitScript(
      (args: { version: number; platform: string }) => {
        const { version, platform } = args;
        const brands = [
          { brand: 'Google Chrome', version: String(version) },
          { brand: 'Chromium', version: String(version) },
          { brand: 'Not/A)Brand', version: '99' },
        ];
        const uad = {
          brands,
          mobile: false,
          platform,
          toJSON: () => ({ brands, mobile: false, platform }),
          getHighEntropyValues: (hints: string[]): Promise<Record<string, unknown>> => {
            const map: Record<string, unknown> = {
              architecture: 'x86',
              bitness: '64',
              brands,
              fullVersionList: brands.map((b) => ({ brand: b.brand, version: `${b.version}.0.0.0` })),
              mobile: false,
              model: '',
              platform,
              platformVersion: '15.0.0',
              uaFullVersion: `${version}.0.0.0`,
            };
            return Promise.resolve(Object.fromEntries(hints.map((h) => [h, map[h] ?? ''])));
          },
        };
        try {
          Object.defineProperty(navigator, 'userAgentData', {
            get: () => uad,
            configurable: true,
            enumerable: true,
          });
        } catch {
          // Property non-configurable — patch the existing object in place
          const existing = (navigator as unknown as Record<string, unknown>).userAgentData as Record<string, unknown> | null;
          if (existing) {
            try { Object.assign(existing, uad); } catch { /* best-effort */ }
          }
        }
      },
      { version: chromeMajor, platform: uaPlatform },
    );

    // Patch headless-specific signals that fingerprint scanners use to label a
    // browser as "Incognito Window" or "automation":
    //   1. outerHeight == innerHeight → add browser chrome height (~85px)
    //   2. screen.availHeight == screen.height → subtract macOS menu bar (25px)
    //   3. storage.persist() returns false → return true
    await context.addInitScript(() => {
      const CHROME_H = 85;
      const MENU_BAR = 25;

      try {
        Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + CHROME_H, configurable: true });
        Object.defineProperty(window, 'outerWidth',  { get: () => window.innerWidth,              configurable: true });
      } catch { /* already immutable */ }

      try {
        const h = window.screen.height;
        Object.defineProperty(window.screen, 'availHeight', { get: () => h - MENU_BAR, configurable: true });
        Object.defineProperty(window.screen, 'availTop',    { get: () => MENU_BAR,      configurable: true });
      } catch { /* already immutable */ }

      if (typeof navigator.storage?.persist === 'function') {
        try {
          Object.defineProperty(navigator.storage, 'persist', {
            value: () => Promise.resolve(true),
            writable: false,
            configurable: true,
          });
        } catch { /* already immutable */ }
      }
    });

    // Patch WebGL consistency so pixelscan's checkFingerprintMasking() passes.
    //
    // Two issues in headless mode:
    //
    // 1. getFixedRedBoxHash() mismatch
    //    pixelscan draws a 256×24 WebGL red rectangle, hashes the readPixels output
    //    with SHA-256, and compares to a hardcoded expected value.  The headless
    //    SwiftShader renderer produces slightly different edge pixels than a real GPU,
    //    so the hash never matches.  We fill the buffer with the analytically-correct
    //    pixel pattern whenever readPixels is called on a 256×24 canvas.
    //
    // 2. Worker / main-thread WebGL divergence
    //    checkWebworkerValues() creates a blob Worker that reads WebGL vendor/renderer
    //    via OffscreenCanvas (unpatched scope) and compares them to the main-thread
    //    values (patched by the stealth plugin to "Intel Inc." / "Intel Iris OpenGL
    //    Engine").  The mismatch makes the check fail.  We intercept
    //    MessageEvent.prototype.data so that any message carrying the WebGL probe
    //    data ({offcanvas:{unmasked_vender, unmasked_renderer}}) is rewritten to the
    //    spoofed Intel strings before pixelscan's handler compares them.
    await context.addInitScript(() => {
      // ── 1. readPixels patch ──────────────────────────────────────────────
      const _origReadPixels = WebGLRenderingContext.prototype.readPixels;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (WebGLRenderingContext.prototype as any).readPixels = function(
        x: number, y: number, width: number, height: number,
        format: number, type: number, pixels: Uint8Array | null,
      ) {
        if (width === 256 && height === 24 && pixels instanceof Uint8Array) {
          // Analytically-correct red rectangle on transparent canvas:
          //   NDC (-0.75, -0.75)→(0.75, 0.75) on 256×24 maps to
          //   rows 3–20 (from bottom), cols 32–223.
          pixels.fill(0);
          for (let row = 3; row < 21; row++) {
            for (let col = 32; col < 224; col++) {
              const idx = (row * 256 + col) * 4;
              pixels[idx] = 255;     // R
              pixels[idx + 3] = 255; // A
            }
          }
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (_origReadPixels as any).call(this, x, y, width, height, format, type, pixels);
      };

      // ── 2. MessageEvent.data interception ────────────────────────────────
      // checkWebworkerValues() has a blob Worker (unpatched OffscreenCanvas scope)
      // post {value:{offcanvas:{unmasked_vender,unmasked_renderer}}} with real
      // SwiftShader strings back to the main thread.  importScripts-based patching
      // of the worker itself fails silently (CSP / module-worker restrictions),
      // so we intercept at the receiver side: override MessageEvent.prototype.data
      // so any read of a message carrying the WebGL probe returns the spoofed Intel
      // strings that match what the stealth plugin injected on the main thread.
      const _msgDataDesc = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _origMsgGet = _msgDataDesc && (_msgDataDesc.get as (() => any) | undefined);
      if (_origMsgGet) {
        const _msgCache = new WeakMap<object, unknown>();
        Object.defineProperty(MessageEvent.prototype, 'data', {
          get(this: MessageEvent) {
            if (_msgCache.has(this)) return _msgCache.get(this);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = (_origMsgGet as any).call(this);
            if (d && typeof d === 'object' && d.value && d.value.offcanvas) {
              // Replace real SwiftShader strings with the spoofed Intel values so
              // checkWebworkerValues() comparison (worker == main-thread) passes.
              d.value.offcanvas.unmasked_vender   = 'Intel Inc.';
              d.value.offcanvas.unmasked_renderer = 'Intel Iris OpenGL Engine';
            }
            _msgCache.set(this, d);
            return d;
          },
          configurable: true,
        });
      }
    });

    return { context, profile, userDataDir };
  }
}
