/**
 * Trace what replaces toDataURL and what computes ic.
 */
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

  // Step 1: Patch our usual stuff first
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

  // Step 2: INTERCEPT fetch to capture ic value
  await context.addInitScript(() => {
    const origFetch = window.fetch.bind(window);
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/s/api/gf') && init?.body) {
        const body = init.body as string;
        console.log('[FETCH_GF_BODY]', body);
        // Try to trace where ic comes from using Error stack
        console.log('[FETCH_GF_STACK]', new Error().stack?.split('\n').slice(0, 5).join(' | '));
      }
      return origFetch(input, init);
    };
  });

  // Step 3: Check if toDataURL is native BEFORE stealth runs
  await context.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.toDataURL;
    console.log('[PRE_STEALTH] toDataURL native?', /native/i.test(orig.toString()));
    
    // Hook AFTER all other scripts to see if anything overrides it
    const origDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toDataURL');
    console.log('[PRE_STEALTH] toDataURL descriptor:', JSON.stringify({
      configurable: origDesc?.configurable,
      writable: origDesc?.writable,
      hasValue: 'value' in (origDesc ?? {}),
    }));
  });

  const page = await context.newPage();
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1000);

  // Check toDataURL AFTER all page scripts have run
  const tdUrl = await page.evaluate(() => {
    const orig = HTMLCanvasElement.prototype.toDataURL;
    return {
      isNative: /native/i.test(orig.toString()),
      toString: orig.toString().substring(0, 100),
    };
  });
  console.log('\n=== toDataURL after page load ===');
  console.log(JSON.stringify(tdUrl, null, 2));

  // Check ic-related properties
  const icProps = await page.evaluate(async () => {
    const est = await navigator.storage.estimate();
    return {
      storageQuota: est.quota,
      storageUsage: est.usage,
      hasIndexedDB: typeof indexedDB !== 'undefined',
      hasCookieStore: typeof (window as unknown as Record<string, unknown>).cookieStore !== 'undefined',
      performanceMemory: typeof (performance as unknown as Record<string, unknown>).memory !== 'undefined',
      isPrivate: false,  // placeholder
    };
  });
  console.log('\n=== IC-related properties ===');
  console.log(JSON.stringify(icProps, null, 2));

  console.log('\nClicking scan button...');
  await page.click('text=Scan My Browser Now');
  await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
  await page.waitForSelector('.consistency-check', { timeout: 15_000 });
  await page.waitForTimeout(2000);

  console.log('\n=== Console logs ===');
  consoleLogs.forEach(l => console.log(l));

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
