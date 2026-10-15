import { chromium } from 'playwright-extra';
import type { Response } from 'playwright';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);
const SMOKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({ userAgent: SMOKE_UA, viewport: { width: 1440, height: 900 } });

  const allResources: Array<{ url: string; ct: string; size: number }> = [];

  context.on('response', async (resp: Response) => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] ?? '';
    if (ct.includes('javascript') || url.match(/\.(js|mjs)(\?|$)/)) {
      try {
        const body = await resp.text();
        allResources.push({ url, ct, size: body.length });
      } catch {
        allResources.push({ url, ct, size: -1 });
      }
    }
  });

  const page = await browser.newPage();
  await page.goto('https://pixelscan.net/fingerprint-check', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);
  
  console.log('=== ALL JS RESOURCES ===');
  allResources.forEach(r => console.log(`  ${r.url} [${r.size}] ${r.ct}`));
  
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
