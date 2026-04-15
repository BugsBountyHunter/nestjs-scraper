import { chromium } from 'playwright-extra';
import type { Route, Request, Response } from 'playwright';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

const SMOKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({ userAgent: SMOKE_UA, viewport: { width: 1440, height: 900 } });

  const jsFiles: Array<{ url: string; size: number }> = [];

  // Listen for responses
  context.on('response', async (resp: Response) => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] ?? '';
    if ((ct.includes('javascript') || url.endsWith('.js')) && url.includes('pixelscan')) {
      try {
        const body = await resp.text();
        jsFiles.push({ url, size: body.length });
        if (body.length > 5000) {
          // Search for detection keywords
          const keywords = ['incognito', 'isPrivate', ' ic:', '"ic"', 'ic,', 'Masking', 'canvas', 'storage.estimate', 'requestFileSystem', 'cookieEnabled'];
          for (const kw of keywords) {
            if (body.toLowerCase().includes(kw.toLowerCase())) {
              const idx = body.toLowerCase().indexOf(kw.toLowerCase());
              const snippet = body.substring(Math.max(0, idx-100), Math.min(body.length, idx+200));
              console.log(`\nKEYWORD "${kw}" in ${url.split('/').pop()}:`);
              console.log(snippet);
            }
          }
        }
      } catch {}
    }
  });

  const page = await browser.newPage();
  await page.goto('https://pixelscan.net/fingerprint-check', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(3000);

  console.log('\n=== JS FILES ===');
  jsFiles.forEach(f => console.log(`  ${f.url.split('/').pop()} (${f.size} bytes)`));

  await browser.close();
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
