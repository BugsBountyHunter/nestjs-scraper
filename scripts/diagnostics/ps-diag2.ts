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

async function main() {
  const userDataDir = path.join(os.tmpdir(), `pw-diag2-${crypto.randomBytes(8).toString('hex')}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    userAgent: SMOKE_UA,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'sec-ch-ua': '"Google Chrome";v="147", "Chromium";v="147", "Not/A)Brand";v="99"',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-mobile': '?0',
    },
  });

  // Capture dispatch details + intercept worker message
  await context.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__psCapture = { dispatches: [], workerMsgs: [], iframeMsgs: [] };

    // Intercept NgRx-style store dispatch: Angular stores often call ngrx dispatch
    // We patch CustomEvent or the specific dispatch function after page load
    // Simpler: intercept window message events to see iframe + worker payloads
    const _origAEL = window.addEventListener.bind(window);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).addEventListener = function(type: string, handler: any, opts?: any) {
      if (type === 'message') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrapped = function(e: MessageEvent) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__psCapture.iframeMsgs.push(JSON.parse(JSON.stringify(e.data)));
          } catch (_) {}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (handler as any).apply(this, arguments);
        };
        return _origAEL(type, wrapped, opts);
      }
      return _origAEL(type, handler, opts);
    };

    // Also patch Worker.onmessage assignment to log the raw worker message
    const _OrigWorker = window.Worker;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Worker = function(src: string | URL, opts?: WorkerOptions) {
      const w = new _OrigWorker(src as string, opts);
      const origOnmsg = Object.getOwnPropertyDescriptor(Worker.prototype, 'onmessage');
      Object.defineProperty(w, 'onmessage', {
        set(fn: (e: MessageEvent) => void) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          origOnmsg?.set?.call(w, function(e: MessageEvent) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).__psCapture.workerMsgs.push(JSON.parse(JSON.stringify(e.data)));
            } catch (_) {}
            fn.call(w, e);
          });
        },
        get() { return origOnmsg?.get?.call(w); },
        configurable: true,
      });
      return w;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Worker.prototype = _OrigWorker.prototype;
  });

  // The actual patches
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

    const _d = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _g = _d && (_d.get as (() => any) | undefined);
    if (_g) {
      const _c = new WeakMap<object, unknown>();
      try {
        Object.defineProperty(MessageEvent.prototype, 'data', {
          get(this: MessageEvent) {
            if (_c.has(this)) return _c.get(this);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = (_g as any).call(this);
            if (d && typeof d === 'object' && d.value && d.value.offcanvas) {
              d.value.offcanvas.unmasked_vender   = 'Intel Inc.';
              d.value.offcanvas.unmasked_renderer = 'Intel Iris OpenGL Engine';
            }
            _c.set(this, d);
            return d;
          },
          configurable: true,
        });
      } catch (_e) {}
    }
  });

  try {
    const page = await context.newPage();
    await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
    await page.click('text=Scan My Browser Now');
    await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
    await page.waitForSelector('.consistency-check', { timeout: 15_000 });
    await page.waitForTimeout(8000);

    const captured = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).__psCapture;
    });
    console.log('\n=== WORKER MESSAGES ===');
    console.log(JSON.stringify(captured.workerMsgs, null, 2));
    console.log('\n=== IFRAME/WINDOW MESSAGES (first 3) ===');
    captured.iframeMsgs.slice(0, 3).forEach((m: unknown) => console.log(JSON.stringify(m)));

    // Also get card values
    const cards = await page.evaluate(() => {
      const r: Array<{l: string; v: string}> = [];
      document.querySelectorAll('.checker-card-wrapper').forEach(w => {
        r.push({
          l: w.querySelector('.checker-card__label')?.textContent?.trim() ?? '',
          v: w.querySelector('.checker-card__value-wrapper')?.textContent?.trim() ?? '',
        });
      });
      return r;
    });
    console.log('\n=== CARDS ===');
    cards.forEach((c: {l:string;v:string}) => console.log(`  [${c.l}] ${c.v}`));
  } finally {
    await context.close().catch(() => undefined);
    fs.rm(userDataDir, { recursive: true, force: true }, () => undefined);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
