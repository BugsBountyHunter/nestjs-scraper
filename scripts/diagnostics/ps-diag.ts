/**
 * Diagnostic script — evaluates key conditions from checkFingerprintMasking()
 * directly in the page context to identify which ones fail.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { chromium } from 'playwright-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

const SMOKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';
const SMOKE_SEC_CH_UA_HEADERS = {
  'sec-ch-ua': '"Google Chrome";v="147", "Chromium";v="147", "Not/A)Brand";v="99"',
  'sec-ch-ua-platform': '"macOS"',
  'sec-ch-ua-mobile': '?0',
};

async function main() {
  const userDataDir = path.join(os.tmpdir(), `pw-diag-${crypto.randomBytes(8).toString('hex')}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    userAgent: SMOKE_UA,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: SMOKE_SEC_CH_UA_HEADERS,
  });

  // Diagnostic: check MessageEvent.prototype.data descriptor
  await context.addInitScript(() => {
    const desc = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__diagMsgData = {
      exists: !!desc,
      hasGetter: typeof desc?.get === 'function',
      configurable: desc?.configurable,
      enumerable: desc?.enumerable,
    };
  });

  // The actual patches from patchWebGLConsistency
  await context.addInitScript(() => {
    const _origReadPixels = WebGLRenderingContext.prototype.readPixels;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (WebGLRenderingContext.prototype as any).readPixels = function(
      x: number, y: number, w: number, h: number, fmt: number, type: number, px: Uint8Array | null,
    ) {
      if (w === 256 && h === 24 && px instanceof Uint8Array) {
        px.fill(0);
        for (let row = 3; row < 21; row++) {
          for (let col = 32; col < 224; col++) {
            const i = (row * 256 + col) * 4;
            px[i] = 255; px[i + 3] = 255;
          }
        }
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (_origReadPixels as any).call(this, x, y, w, h, fmt, type, px);
    };

    const _msgDataDesc = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _origMsgGet = _msgDataDesc && (_msgDataDesc.get as (() => any) | undefined);
    if (_origMsgGet) {
      const _msgCache = new WeakMap<object, unknown>();
      try {
        Object.defineProperty(MessageEvent.prototype, 'data', {
          get(this: MessageEvent) {
            if (_msgCache.has(this)) return _msgCache.get(this);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = (_origMsgGet as any).call(this);
            if (d && typeof d === 'object' && d.value && d.value.offcanvas) {
              d.value.offcanvas.unmasked_vender   = 'Intel Inc.';
              d.value.offcanvas.unmasked_renderer = 'Intel Iris OpenGL Engine';
            }
            _msgCache.set(this, d);
            return d;
          },
          configurable: true,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__diagMsgPatch = 'installed';
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__diagMsgPatch = 'FAILED: ' + String(e);
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__diagMsgPatch = 'skipped: no getter';
    }
  });

  try {
    const page = await context.newPage();
    await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });

    // Diagnose pre-scan conditions
    const pre = await page.evaluate(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      diagMsgData: (window as any).__diagMsgData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      diagMsgPatch: (window as any).__diagMsgPatch,
      navigatorOwnProps: Object.getOwnPropertyNames(navigator).slice(0, 10),
      checkFakeNavigatorObject: !Object.getOwnPropertyNames(navigator)[0],
      webglVendor: (() => {
        try {
          const c = document.createElement('canvas').getContext('webgl');
          if (!c) return 'no-context';
          const ext = c.getExtension('WEBGL_debug_renderer_info');
          if (!ext) return 'no-ext';
          return c.getParameter(ext.UNMASKED_VENDOR_WEBGL);
        } catch (e) { return 'error: ' + String(e); }
      })(),
      navigatorUA: navigator.userAgent.slice(0, 60),
    }));
    console.log('\n=== PRE-SCAN DIAGNOSTICS ===');
    console.log(JSON.stringify(pre, null, 2));

    // Run the scan
    await page.click('text=Scan My Browser Now');
    await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
    await page.waitForSelector('.consistency-check', { timeout: 15_000 });
    await page.waitForTimeout(6000);

    // Intercept Angular store dispatch by reading rendered card details
    const details = await page.evaluate(() => {
      const rows: Array<{key: string; value: string}> = [];
      document.querySelectorAll('.checker-card-wrapper').forEach(w => {
        const label = w.querySelector('.checker-card__label')?.textContent?.trim() ?? '';
        const val = w.querySelector('.checker-card__value-wrapper')?.textContent?.trim() ?? '';
        // Also try to get sub-items
        const subs: string[] = [];
        w.querySelectorAll('[class*="detail"], [class*="item"], [class*="sub"]').forEach(el => {
          const t = el.textContent?.trim();
          if (t) subs.push(t);
        });
        rows.push({ key: label, value: val + (subs.length ? ' | subs: ' + subs.join('; ') : '') });
      });
      return rows;
    });
    console.log('\n=== CARD DETAILS ===');
    details.forEach(d => console.log(`  [${d.key}] ${d.value}`));
  } finally {
    await context.close().catch(() => undefined);
    fs.rm(userDataDir, { recursive: true, force: true }, () => undefined);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
