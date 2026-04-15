/**
 * Targeted diagnostic: canvas toDataURL interception + ic signal analysis
 */
import { chromium } from 'playwright-extra';
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
    extraHTTPHeaders: {
      'sec-ch-ua': '"Google Chrome";v="147", "Chromium";v="147", "Not/A)Brand";v="99"',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-mobile': '?0',
    },
  });

  // Patch userAgentData
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
      try { Object.defineProperty(navigator, 'userAgentData', { get: () => uad, configurable: true }); } catch (_) {}
    },
    { version: 147, platform: 'macOS' },
  );

  // Patch headless signals
  await context.addInitScript(() => {
    try { Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 85, configurable: true }); } catch (_) {}
    try { Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth, configurable: true }); } catch (_) {}
    try {
      const h = window.screen.height;
      Object.defineProperty(window.screen, 'availHeight', { get: () => h - 25, configurable: true });
      Object.defineProperty(window.screen, 'availTop', { get: () => 25, configurable: true });
    } catch (_) {}
    try { Object.defineProperty(navigator.storage, 'persist', { value: () => Promise.resolve(true), configurable: true }); } catch (_) {}
  });

  // --- INTERCEPT canvas.toDataURL to find empty canvas calls ---
  await context.addInitScript(() => {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type?: string, quality?: unknown) {
      const result = origToDataURL.call(this, type, quality as number | undefined);
      const isEmpty = result === 'data:,' || result.length < 30;
      if (isEmpty) {
        // Log context: what was drawn on this canvas
        const ctx2d = (this as HTMLCanvasElement).getContext('2d');
        console.log(`[CANVAS_EMPTY] w=${this.width} h=${this.height} type=${type ?? 'image/png'} result="${result}" ctx2d=${ctx2d != null}`);
      } else {
        console.log(`[CANVAS_OK] w=${this.width} h=${this.height} type=${type ?? 'image/png'} len=${result.length}`);
      }
      return result;
    };
  });

  // --- INTERCEPT storage.estimate to check incognito detection ---
  await context.addInitScript(() => {
    if (navigator.storage?.estimate) {
      const orig = navigator.storage.estimate.bind(navigator.storage);
      (navigator.storage as unknown as Record<string, unknown>).estimate = async function() {
        const result = await orig();
        console.log(`[STORAGE_ESTIMATE] quota=${result.quota} usage=${result.usage}`);
        return result;
      };
    }
  });

  const page = await context.newPage();
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[CANVAS_') || text.startsWith('[STORAGE_')) {
      consoleLogs.push(text);
    }
  });

  console.log('Navigating to pixelscan.net...');
  await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1000);

  // Check what ic is computed to BEFORE clicking the button
  const icBeforeClick = await page.evaluate(async () => {
    const est = await navigator.storage.estimate();
    const persist = await navigator.storage.persist();
    return {
      storageQuota: est.quota,
      storagePersist: persist,
      hasIndexedDB: 'indexedDB' in window,
      hasLocalStorage: 'localStorage' in window,
      hasSessionStorage: 'sessionStorage' in window,
      localStorageLen: localStorage.length,
      sessionStorageLen: sessionStorage.length,
    };
  });
  console.log('\n=== BEFORE CLICK - STORAGE STATE ===');
  console.log(JSON.stringify(icBeforeClick, null, 2));

  console.log('\nClicking scan button...');
  await page.click('text=Scan My Browser Now');
  await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
  await page.waitForSelector('.consistency-check', { timeout: 15_000 });
  await page.waitForTimeout(3000);

  console.log('\n=== CANVAS CALLS ===');
  consoleLogs.filter(l => l.startsWith('[CANVAS_')).forEach(l => console.log(l));

  console.log('\n=== STORAGE CALLS ===');
  consoleLogs.filter(l => l.startsWith('[STORAGE_')).forEach(l => console.log(l));

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
