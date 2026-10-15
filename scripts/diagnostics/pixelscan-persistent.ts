import { chromium } from 'playwright-extra';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);
const SMOKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function main() {
  const userDataDir = path.join(os.tmpdir(), 'ps-test-profile-' + Date.now());
  fs.mkdirSync(userDataDir, { recursive: true });
  console.log('userDataDir:', userDataDir);

  // Use launchPersistentContext — gives real persistent storage (not incognito)
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    userAgent: SMOKE_UA,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    extraHTTPHeaders: {
      'sec-ch-ua': '"Google Chrome";v="147", "Chromium";v="147", "Not/A)Brand";v="99"',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-mobile': '?0',
    },
  });

  await context.addInitScript(
    (args: { version: number }) => {
      const v = args.version;
      const platform = 'macOS';
      const brands = [
        { brand: 'Google Chrome', version: String(v) },
        { brand: 'Chromium', version: String(v) },
        { brand: 'Not/A)Brand', version: '99' },
      ];
      const uad = {
        brands, mobile: false, platform,
        toJSON: () => ({ brands, mobile: false, platform }),
        getHighEntropyValues: (hints: string[]): Promise<Record<string, unknown>> => {
          const map: Record<string, unknown> = {
            architecture: 'x86', bitness: '64', brands,
            fullVersionList: brands.map((b) => ({ brand: b.brand, version: `${b.version}.0.0.0` })),
            mobile: false, model: '', platform, platformVersion: '15.0.0',
            uaFullVersion: `${v}.0.0.0`,
          };
          return Promise.resolve(Object.fromEntries(hints.map((h) => [h, map[h] ?? ''])));
        },
      };
      try { Object.defineProperty(navigator, 'userAgentData', { get: () => uad, configurable: true }); } catch (_) {}
      try { Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 85, configurable: true }); } catch (_) {}
      try { Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth, configurable: true }); } catch (_) {}
      try {
        const h = window.screen.height;
        Object.defineProperty(window.screen, 'availHeight', { get: () => h - 25, configurable: true });
        Object.defineProperty(window.screen, 'availTop', { get: () => 25, configurable: true });
      } catch (_) {}
      try { Object.defineProperty(navigator.storage, 'persist', { value: () => Promise.resolve(true), configurable: true }); } catch (_) {}
    },
    { version: 147 },
  );

  const apiCalls: Array<{ url: string; body: string }> = [];
  await context.route('**/s/api/**', async (route, request) => {
    const body = request.postData();
    if (body && request.method() === 'POST') apiCalls.push({ url: request.url(), body });
    await route.continue();
  });

  const page = await context.newPage();
  await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.click('text=Scan My Browser Now');
  await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
  await page.waitForSelector('.consistency-check', { timeout: 15_000 });
  await page.waitForTimeout(3000);

  const storageInfo = await page.evaluate(async () => {
    const est = await navigator.storage.estimate();
    const persist = await navigator.storage.persist();
    return { quota: est.quota, usage: est.usage, persist, quotaGb: ((est.quota ?? 0) / 1e9).toFixed(1) + ' GB' };
  });
  console.log('Storage:', JSON.stringify(storageInfo));

  const gfCall = apiCalls.find(c => c.url.includes('/s/api/gf'));
  console.log('gf POST body:', gfCall?.body ?? 'not found');

  const cbvCall = apiCalls.find(c => c.url.includes('/s/api/cbv'));
  console.log('cbv POST body:', cbvCall?.body ?? 'not found');

  const cards = await page.evaluate(() => {
    const result: Array<{label: string; value: string}> = [];
    document.querySelectorAll('.checker-card-wrapper').forEach((w) => {
      const label = w.querySelector('.checker-card__label')?.textContent?.trim() ?? '';
      const value = w.querySelector('.checker-card__value-wrapper')?.textContent?.trim() ?? '';
      result.push({ label, value });
    });
    return result;
  });
  console.log('\n=== CARDS ===');
  cards.forEach(c => console.log(`  ${c.label}: ${c.value}`));

  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
