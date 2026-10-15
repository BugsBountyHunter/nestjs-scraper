import { chromium } from 'playwright-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);
const SMOKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({ userAgent: SMOKE_UA, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const jsFiles: string[] = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = (resp.headers()['content-type'] ?? '');
    if (ct.includes('javascript') || url.match(/\.(js|mjs)(\?|$)/)) {
      jsFiles.push(`${url} [${ct}]`);
    }
  });

  await page.goto('https://pixelscan.net/fingerprint-check', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(3000);
  
  console.log('=== JS FILES ===');
  jsFiles.forEach(f => console.log(' ', f));
  console.log(`Total: ${jsFiles.length}`);
  
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
