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
  const userDataDir = path.join(os.tmpdir(), `pw-diag3-${crypto.randomBytes(8).toString('hex')}`);
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

  // Intercept postMessage FROM iframes to see raw fingerprint data  
  await context.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__allMsgs = [];
    const _origAEL = EventTarget.prototype.addEventListener;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EventTarget.prototype.addEventListener = function(type: string, handler: any, opts?: any) {
      if (type === 'message' && this === window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = function(e: MessageEvent) {
          try {
            // Use the ORIGINAL getter to bypass our patch and see raw data
            const origGetter = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data')?.get;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawData = origGetter ? (origGetter as any).call(e) : e.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__allMsgs.push({
              src: e.source === window ? 'self' : 'frame',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: JSON.parse(JSON.stringify(rawData)),
            });
          } catch (_err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__allMsgs.push({ src: 'unknown', err: String(_err) });
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (handler as any).apply(this, arguments);
        };
        return _origAEL.call(this, type, w, opts);
      }
      return _origAEL.call(this, type, handler, opts);
    };
  });

  try {
    const page = await context.newPage();
    await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
    await page.click('text=Scan My Browser Now');
    await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
    await page.waitForTimeout(10_000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgs = await page.evaluate(() => (window as any).__allMsgs);
    console.log(`\n=== ALL MESSAGES (${msgs.length}) ===`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    msgs.forEach((m: any, i: number) => {
      if (m.data?.messageSource) {
        const val = m.data.value;
        const keys = typeof val === 'object' && val ? Object.keys(val) : [];
        console.log(`[${i}] ${m.src} | ${m.data.messageSource} | value keys: [${keys.join(', ')}]`);
        if (m.data.messageSource === 'fpCollect') {
          console.log('      FULL VALUE:', JSON.stringify(val));
        }
        if (m.data.messageSource === 'fpWebworker') {
          console.log('      offcanvas:', JSON.stringify(val?.offcanvas));
        }
      } else {
        console.log(`[${i}] ${m.src} | non-fpCollect:`, JSON.stringify(m.data)?.slice(0, 100));
      }
    });
  } finally {
    await context.close().catch(() => undefined);
    fs.rm(userDataDir, { recursive: true, force: true }, () => undefined);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
