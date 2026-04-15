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
    this.timeout = config.get<number>('PLAYWRIGHT_TIMEOUT', 30000);
  }

  onModuleInit(): void {
    this.logger.log(`Browser factory ready — headless: ${this.headless}`);
  }

  async createContext(proxy: ProxyConfig | null): Promise<{ context: BrowserContext; profile: BrowserProfile }> {
    const profile = this.fingerprintService.generateProfile();

    const browser = await chromium.launch({
      headless: this.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${profile.viewport.width},${profile.viewport.height}`,
      ],
    });

    const contextOptions: Parameters<typeof browser.newContext>[0] = {
      userAgent: profile.userAgent,
      viewport: profile.viewport,
      locale: profile.locale,
      timezoneId: profile.timezone,
      colorScheme: 'light',
      extraHTTPHeaders: {
        'Accept-Language': profile.locale,
        'sec-ch-ua': this.fingerprintService.buildSecChUa(profile.userAgent),
        'sec-ch-ua-platform': `"${profile.platform}"`,
        'sec-ch-ua-mobile': '?0',
      },
    };

    if (proxy) {
      contextOptions.proxy = {
        server: proxy.url,
        username: proxy.user,
        password: proxy.pass,
      };
    }

    const context = await browser.newContext(contextOptions);
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
        } catch (_) {
          // Property non-configurable — patch the existing object in place
          const existing = (navigator as Record<string, unknown>).userAgentData as Record<string, unknown> | null;
          if (existing) {
            try { Object.assign(existing, uad); } catch (_2) { /* best-effort */ }
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
      } catch (_) { /* already immutable */ }

      try {
        const h = window.screen.height;
        Object.defineProperty(window.screen, 'availHeight', { get: () => h - MENU_BAR, configurable: true });
        Object.defineProperty(window.screen, 'availTop',    { get: () => MENU_BAR,      configurable: true });
      } catch (_) { /* already immutable */ }

      if (navigator.storage?.persist) {
        try {
          Object.defineProperty(navigator.storage, 'persist', {
            value: () => Promise.resolve(true),
            writable: false,
            configurable: true,
          });
        } catch (_) { /* already immutable */ }
      }
    });

    return { context, profile };
  }
}
