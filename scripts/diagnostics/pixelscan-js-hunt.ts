/**
 * Fetch pixelscan main JS bundle and search for incognito + masking detection code.
 */
import { chromium } from 'playwright-extra';
import type { Route, Request } from 'playwright';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

const SMOKE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const context = await browser.newContext({
    userAgent: SMOKE_UA,
    viewport: { width: 1440, height: 900 },
  });

  // Capture all JS file URLs
  const jsFiles: Array<{ url: string; body: string }> = [];
  await context.route('**/*.js', async (route: Route, req: Request) => {
    const response = await route.fetch();
    let body = '';
    try { body = await response.text(); } catch {}
    const url = req.url();
    // Only capture pixelscan.net JS files
    if (url.includes('pixelscan.net') && body.length > 1000) {
      jsFiles.push({ url, body });
    }
    await route.fulfill({ response });
  });

  const page = await browser.newPage();
  await page.goto('https://pixelscan.net/fingerprint-check', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);

  console.log(`Captured ${jsFiles.length} JS files from pixelscan.net`);
  for (const f of jsFiles) {
    console.log(`\n--- ${f.url} (${f.body.length} bytes) ---`);

    // Search for incognito detection patterns
    const icPatterns = ['incognito', 'isIncognito', 'isPrivate', 'ic:', '"ic"', 'Incognito Window', 'private browsing'];
    const maskPatterns = ['masking', 'Masking', 'detected', 'canvas.*mask', 'fingerprint.*mask'];

    for (const pat of icPatterns) {
      const re = new RegExp(`.{0,80}${pat}.{0,80}`, 'gi');
      const matches = f.body.match(re);
      if (matches) {
        console.log(`\n[IC PATTERN: "${pat}"]`);
        matches.slice(0, 3).forEach(m => console.log('  ' + m.trim()));
      }
    }

    for (const pat of maskPatterns) {
      const re = new RegExp(`.{0,80}${pat}.{0,80}`, 'gi');
      const matches = f.body.match(re);
      if (matches) {
        console.log(`\n[MASK PATTERN: "${pat}"]`);
        matches.slice(0, 3).forEach(m => console.log('  ' + m.trim()));
      }
    }
  }

  await browser.close();
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
