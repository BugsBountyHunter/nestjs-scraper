/**
 * Diagnostic: intercept Fptc fingerprinting to find why iframe returns {}
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

async function main() {
  const userDataDir = path.join(os.tmpdir(), `pw-diag4-${crypto.randomBytes(8).toString('hex')}`);
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

  // Wrap window.Fptc once it's defined to log per-function results/errors
  await context.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__fptcLog = [];

    // Poll until Fptc is defined, then wrap its prototype methods
    const _tryWrap = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const F = (window as any).Fptc;
      if (!F) { setTimeout(_tryWrap, 50); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const origFptc = F;
      // Replace Fptc with a version that logs per-function results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Fptc = function(this: any) {
        origFptc.call(this);
        // Wrap each function after construction
        const names = this.functionsNames || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        names.forEach((name: string) => {
          const orig = this[name];
          if (typeof orig !== 'function') return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this[name] = async function(this: any) {
            try {
              const r = await orig.call(this);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).__fptcLog.push({ name, ok: true, type: typeof r, len: String(r).length });
              return r;
            } catch (e) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).__fptcLog.push({ name, ok: false, err: String(e) });
              throw e;
            }
          };
        });
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__fptcLog.push({ name: '_wrap', ok: true });
    };
    _tryWrap();
  });

  try {
    const page = await context.newPage();
    await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
    await page.click('text=Scan My Browser Now');
    await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
    await page.waitForTimeout(8000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log = await page.evaluate(() => (window as any).__fptcLog);
    console.log('\n=== FPTC FUNCTION LOG ===');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log.forEach((l: any) => {
      if (l.ok) console.log(`  PASS  ${l.name}  (type=${l.type}, len=${l.len})`);
      else       console.log(`  FAIL  ${l.name}  → ${l.err}`);
    });
  } finally {
    await context.close().catch(() => undefined);
    fs.rm(userDataDir, { recursive: true, force: true }, () => undefined);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
