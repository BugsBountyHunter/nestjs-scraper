import { chromium } from 'playwright-extra';
import * as fs from 'fs';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);
const SMOKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

const TARGET_JS = [
  'fptc.min.js',
  'main.',
  '902.',
  'common.',
];

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: SMOKE_UA });
  const page = await context.newPage();

  const captured = new Map<string, string>();
  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = (resp.headers()['content-type'] ?? '');
    if (ct.includes('javascript') && TARGET_JS.some(t => url.includes(t))) {
      try {
        const body = await resp.text();
        const name = url.split('/').pop()!.split('?')[0];
        captured.set(name, body);
      } catch {}
    }
  });

  await page.goto('https://pixelscan.net/fingerprint-check', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);
  await browser.close();

  for (const [name, body] of captured) {
    const outPath = `/tmp/ps_${name}`;
    fs.writeFileSync(outPath, body);
    console.log(`Saved ${name} (${body.length} bytes) → ${outPath}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
