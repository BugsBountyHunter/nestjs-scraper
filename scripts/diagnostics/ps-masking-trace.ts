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
const CHUNKS_DIR = process.env.CHUNKS_DIR || path.join(os.homedir(), 'ps-chunks-debug');

async function main() {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
  const userDataDir = path.join(os.tmpdir(), `pw-trc-${crypto.randomBytes(6).toString('hex')}`);

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

  const page = await context.newPage();

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('pixelscan') && (url.endsWith('.js') || url.includes('.js?'))) {
      try {
        const body = await response.text();
        const fname = url.split('/').pop()!.replace(/[?#].*$/, '');
        fs.writeFileSync(path.join(CHUNKS_DIR, fname), body);
      } catch (_) {}
    }
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('test fail') || text.toLowerCase().includes('mask') || text.toLowerCase().includes('c4') || text.toLowerCase().includes('c10')) {
      console.log(`[CONSOLE] ${msg.type()}: ${text}`);
    }
  });

  await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.click('text=Scan My Browser Now');
  await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
  await page.waitForSelector('.consistency-check', { timeout: 15_000 });
  await page.waitForTimeout(3000);

  const cards = await page.evaluate(() => {
    const r: Array<{label: string; value: string}> = [];
    document.querySelectorAll('.checker-card-wrapper').forEach((w: Element) => {
      const label = w.querySelector('.checker-card__label')?.textContent?.trim() ?? '';
      const value = w.querySelector('.checker-card__value-wrapper')?.textContent?.trim() ?? '';
      r.push({ label, value });
    });
    return r;
  });
  cards.forEach(c => console.log(`[CARD] ${c.label}: ${c.value}`));

  await context.close().catch(() => undefined);
  fs.rm(userDataDir, { recursive: true, force: true }, () => undefined);
  console.log(`[DONE] chunks saved to ${CHUNKS_DIR}`);
}
main().catch(e => { console.error(e); process.exit(1); });
