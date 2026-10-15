import { chromium } from 'playwright-extra';
import type { BrowserContext, Route, Request } from 'playwright';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

const SMOKE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';
const SMOKE_SEC_CH_UA_HEADERS = {
  'sec-ch-ua': '"Google Chrome";v="147", "Chromium";v="147", "Not/A)Brand";v="99"',
  'sec-ch-ua-platform': '"macOS"',
  'sec-ch-ua-mobile': '?0',
};

async function patchAll(context: BrowserContext): Promise<void> {
  // userAgentData
  await context.addInitScript(
    (args: { version: number; platform: string }) => {
      const { version: v, platform } = args;
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
      try {
        Object.defineProperty(navigator, 'userAgentData', { get: () => uad, configurable: true, enumerable: true });
      } catch (_) {}
    },
    { version: 147, platform: 'macOS' },
  );

  // headless signals + storage.estimate patch
  await context.addInitScript(() => {
    const CHROME_H = 85;
    const MENU_BAR = 25;
    try {
      Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + CHROME_H, configurable: true });
      Object.defineProperty(window, 'outerWidth',  { get: () => window.innerWidth, configurable: true });
    } catch (_) {}
    try {
      const realH = window.screen.height;
      Object.defineProperty(window.screen, 'availHeight', { get: () => realH - MENU_BAR, configurable: true });
      Object.defineProperty(window.screen, 'availTop',    { get: () => MENU_BAR, configurable: true });
    } catch (_) {}
    try {
      Object.defineProperty(navigator.storage, 'persist', {
        value: () => Promise.resolve(true), writable: false, configurable: true,
      });
    } catch (_) {}
  });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const context = await browser.newContext({
    userAgent: SMOKE_UA,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: SMOKE_SEC_CH_UA_HEADERS,
  });
  await patchAll(context);

  const apiCalls: Array<{ url: string; method: string; requestBody?: string; responseBody?: string; status?: number }> = [];

  // Intercept all /s/api/* calls
  await context.route('**/s/api/**', async (route: Route, request: Request) => {
    const reqBody = request.postData();
    const response = await route.fetch();
    let respBody = '';
    try { respBody = await response.text(); } catch {}
    apiCalls.push({
      url: request.url(),
      method: request.method(),
      requestBody: reqBody ?? undefined,
      responseBody: respBody,
      status: response.status(),
    });
    await route.fulfill({ response });
  });

  const page = await context.newPage();
  console.log('Navigating to pixelscan.net...');
  await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);

  console.log('Clicking scan button...');
  await page.click('text=Scan My Browser Now');
  await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
  await page.waitForSelector('.consistency-check', { timeout: 15_000 });
  await page.waitForTimeout(3000);

  // Print all intercepted API calls
  console.log('\n=== INTERCEPTED API CALLS ===');
  for (const call of apiCalls) {
    console.log(`\n${call.method} ${call.url}  [status: ${call.status}]`);
    if (call.requestBody) console.log('  REQ:', call.requestBody.substring(0, 500));
    if (call.responseBody) console.log('  RES:', call.responseBody.substring(0, 500));
  }

  // Check the page's storage.estimate result directly
  const storageInfo = await page.evaluate(async () => {
    const est = await navigator.storage.estimate();
    const persist = await navigator.storage.persist();
    return { quota: est.quota, usage: est.usage, persist };
  });
  console.log('\n=== STORAGE INFO ===');
  console.log(JSON.stringify(storageInfo, null, 2));

  // Read all the checker cards
  const cards = await page.evaluate(() => {
    const result: Array<{ label: string; value: string }> = [];
    document.querySelectorAll('.checker-card-wrapper').forEach((w) => {
      const label = w.querySelector('.checker-card__label')?.textContent?.trim() ?? '';
      const value = w.querySelector('.checker-card__value-wrapper')?.textContent?.trim() ?? '';
      result.push({ label, value } as {label: string; value: string});
    });
    return result;
  });
  console.log('\n=== CARDS ===');
  cards.forEach(c => console.log(`  ${c.label}: ${c.value}`));

  await browser.close();
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
