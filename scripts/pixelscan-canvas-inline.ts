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
    },
    { version: 147 },
  );

  const page = await context.newPage();
  await page.goto('https://pixelscan.net', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);

  // Directly run fptc's _canvasHash logic inside the page and report what happens
  const canvasResult = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 300;
    c.height = 150;
    c.style.display = 'inline';
    const ctx = c.getContext('2d');
    if (!ctx) return { error: 'no 2d context', isNative: false, dataUrlLen: 0, dataUrl: '' };

    // Replicate fptc's drawing
    ctx.rect(0, 0, 10, 10);
    ctx.rect(2, 2, 6, 6);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.font = '11pt no-real-font-590';
    ctx.fillText('Cwm fjordbank glyphs vext quiz, 😃', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.2)';
    ctx.font = '14pt Arial';
    ctx.fillText('Cwm fjordbank glyphs vext quiz, 😃', 4, 45);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(0,255,255)';
    ctx.beginPath();
    ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(255,255,0)';
    ctx.beginPath();
    ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    const isNative = /native/i.test(c.toDataURL.toString());
    const dataUrl = isNative ? c.toDataURL() : '';

    return {
      error: null,
      isNative,
      dataUrlLen: dataUrl.length,
      dataUrlPrefix: dataUrl.substring(0, 40),
      isEmpty: dataUrl === '' || dataUrl === 'data:,' || dataUrl.length < 30,
    };
  });

  console.log('\n=== CANVAS HASH TEST (inline, after page load + patches) ===');
  console.log(JSON.stringify(canvasResult, null, 2));

  // Now check: does fptc think toDataURL is native?
  const fptcCheck = await page.evaluate(() => {
    // Access the live Fptc object if it exists
    const fptc = (window as unknown as Record<string, unknown>)['Fptc'];
    if (!fptc) return { fptcFound: false };
    
    try {
      const inst = new (fptc as new () => Record<string, unknown>)();
      return {
        fptcFound: true,
        canvasHashValue: inst['_canvasHash'] as string,
        canvasHashLen: (inst['_canvasHash'] as string)?.length ?? 0,
        canvasHashEmpty: inst['_canvasHash'] === '',
      };
    } catch (e) {
      return { fptcFound: true, error: String(e) };
    }
  });
  console.log('\n=== FPTC INSTANCE _canvasHash ===');
  console.log(JSON.stringify(fptcCheck, null, 2));

  // Check what the ic signal computes to
  const icCheck = await page.evaluate(async () => {
    const results: Record<string, unknown> = {};
    
    // Check storage estimate
    const est = await navigator.storage.estimate();
    results['storageQuota'] = est.quota;
    results['storageUsage'] = est.usage;
    
    // Check if this quota looks like incognito
    // Real Chrome: ~60% of disk, typically > 50GB
    // Incognito Chrome: typically ~120MB-1.4GB  
    results['quotaGb'] = ((est.quota ?? 0) / 1e9).toFixed(2) + ' GB';
    results['looksIncognito'] = (est.quota ?? 0) < 2e9; // < 2GB = probably incognito
    
    // openDatabase check (deprecated FileSystem API, often fails in incognito)
    results['hasOpenDatabase'] = typeof (window as unknown as Record<string, unknown>).openDatabase !== 'undefined';
    
    // WebSQL check
    results['hasWebSQL'] = typeof (window as unknown as Record<string, unknown>).openDatabase === 'function';
    
    return results;
  });
  console.log('\n=== IC CHECK ===');
  console.log(JSON.stringify(icCheck, null, 2));

  await browser.close();
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
