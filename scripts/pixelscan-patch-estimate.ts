import { chromium } from 'playwright-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);
const SMOKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function main() {
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

      // PATCH: Make storage.estimate() return a large quota like real non-incognito Chrome
      // Real Chrome on macOS reports ~60% of disk space, typically 200GB+
      const LARGE_QUOTA = 500 * 1024 * 1024 * 1024; // 500GB
      try {
        const origEstimate = navigator.storage.estimate.bind(navigator.storage);
        Object.defineProperty(navigator.storage, 'estimate', {
          value: async function() {
            const result = await origEstimate();
            return { ...result, quota: LARGE_QUOTA };
          },
          configurable: true,
          writable: false,
        });
      } catch (_) {}

      // HOOK XHR to capture POST bodies (Angular uses XHR, not window.fetch)
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      const xhrUrls = new Map<XMLHttpRequest, string>();
      
      XMLHttpRequest.prototype.open = function(method: string, url: string) {
        xhrUrls.set(this, url);
        return origOpen.apply(this, arguments as unknown as Parameters<typeof XMLHttpRequest.prototype.open>);
      };

      XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
        const url = xhrUrls.get(this) ?? '';
        if (url.includes('/s/api/') && body) {
          console.log('[XHR_POST]', url, '|', typeof body === 'string' ? body : JSON.stringify(body));
        }
        return origSend.apply(this, arguments as unknown as [Document | XMLHttpRequestBodyInit | null | undefined]);
      };
    },
    { version: 147 },
  );

  // Intercept API calls to see actual request bodies (including gf)
  const apiCalls: Array<{ url: string; method: string; body: string }> = [];
  await context.route('**/s/api/**', async (route, request) => {
    const body = request.postData();
    if (body) apiCalls.push({ url: request.url(), method: request.method(), body });
    await route.continue();
  });

  const page = await context.newPage();
  const consoleLogs: string[] = [];
  page.on('console', msg => { if (msg.text().startsWith('[XHR_')) consoleLogs.push(msg.text()); });

  await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.click('text=Scan My Browser Now');
  await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
  await page.waitForSelector('.consistency-check', { timeout: 15_000 });
  await page.waitForTimeout(3000);

  console.log('\n=== XHR HOOKS (from init script) ===');
  consoleLogs.forEach(l => console.log(l));

  console.log('\n=== API CALLS (from route intercept) ===');
  apiCalls.filter(c => c.method === 'POST').forEach(c => {
    console.log(`POST ${c.url.split('/').pop()} | ${c.body.substring(0, 200)}`);
  });

  const storageCheck = await page.evaluate(async () => {
    const est = await navigator.storage.estimate();
    return { quota: est.quota, quotaGb: (est.quota! / 1e9).toFixed(0) + ' GB' };
  });
  console.log('\n=== STORAGE AFTER PATCH ===');
  console.log(JSON.stringify(storageCheck));

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

  await browser.close();
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
