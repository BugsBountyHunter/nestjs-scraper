/**
 * Mock API responses to confirm which API drives which card.
 */
import { chromium } from 'playwright-extra';
import type { Route, Request } from 'playwright';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

const SMOKE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function runTest(
  patchCbvMatch: boolean,
  patchIc: boolean,
): Promise<{ cards: Array<{label: string; value: string}> }> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const context = await browser.newContext({
    userAgent: SMOKE_UA,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'sec-ch-ua': '"Google Chrome";v="147", "Chromium";v="147", "Not/A)Brand";v="99"',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-mobile': '?0',
    },
  });

  // Patch userAgentData + headless signals
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

  // Intercept API calls — optionally mock cbv and gf
  await context.route('**/s/api/**', async (route: Route, request: Request) => {
    const url = request.url();
    const isCbv = url.includes('/s/api/cbv');
    const isGf = url.includes('/s/api/gf');

    if (isCbv && patchCbvMatch) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', value: { match: true, minorMatch: true, majorMatch: true, isLatest: true, latestVersion: '147.0.7727', legitimate: true } }),
      });
      return;
    }

    if (isGf && patchIc) {
      // Let the request through but modify the body to have ic:false
      const origBody = request.postData();
      let body = origBody;
      if (body) {
        try {
          const parsed = JSON.parse(body);
          parsed.ic = false;
          body = JSON.stringify(parsed);
        } catch {}
      }
      const response = await route.fetch({ postData: body ?? undefined });
      await route.fulfill({ response });
      return;
    }

    await route.continue();
  });

  const page = await context.newPage();
  await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.click('text=Scan My Browser Now');
  await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
  await page.waitForSelector('.consistency-check', { timeout: 15_000 });
  await page.waitForTimeout(3000);

  const cards = await page.evaluate(() => {
    const result: Array<{label: string; value: string}> = [];
    document.querySelectorAll('.checker-card-wrapper').forEach((w) => {
      const label = w.querySelector('.checker-card__label')?.textContent?.trim() ?? '';
      const value = w.querySelector('.checker-card__value-wrapper')?.textContent?.trim() ?? '';
      result.push({ label, value });
    });
    return result;
  });

  await browser.close();
  return { cards };
}

async function main() {
  console.log('=== TEST 1: Mock cbv match:true (keep ic:true) ===');
  const t1 = await runTest(true, false);
  t1.cards.forEach(c => console.log(`  ${c.label}: ${c.value}`));

  console.log('\n=== TEST 2: Mock gf ic:false (keep cbv real) ===');
  const t2 = await runTest(false, true);
  t2.cards.forEach(c => console.log(`  ${c.label}: ${c.value}`));

  console.log('\n=== TEST 3: Mock both cbv match:true AND gf ic:false ===');
  const t3 = await runTest(true, true);
  t3.cards.forEach(c => console.log(`  ${c.label}: ${c.value}`));
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
