import { chromium } from 'playwright-extra';
import * as fs from 'fs';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);
const SMOKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: SMOKE_UA });
  const page = await context.newPage();

  const captured = new Map<string, string>();
  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = (resp.headers()['content-type'] ?? '');
    if (ct.includes('javascript') && url.includes('pixelscan.net')) {
      try {
        const body = await resp.text();
        const name = url.split('/').pop()!.split('?')[0];
        captured.set(name, body);
      } catch {}
    }
  });

  await page.goto('https://pixelscan.net', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1000);
  await page.click('text=Scan My Browser Now').catch(() => {});
  await page.waitForURL('**/fingerprint-check', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await browser.close();

  let found = false;
  for (const [name, body] of captured) {
    const decoded = body.replace(/\\x([0-9a-fA-F]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)));
    if (decoded.includes('/s/api/gf') || body.includes('/s/api/gf')) {
      console.log(`FOUND /s/api/gf in: ${name} (${body.length} bytes)`);
      const idx = decoded.indexOf('/s/api/gf');
      const snippet = decoded.substring(Math.max(0, idx-400), idx+600);
      console.log('SNIPPET:', snippet);
      fs.writeFileSync(`/tmp/ps_gf_chunk_${name}`, decoded);
      found = true;
    }
  }
  if (!found) {
    console.log('Not found in any chunk. Loaded files:', [...captured.keys()].join(', '));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
