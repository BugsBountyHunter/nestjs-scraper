/**
 * Phase 2 smoke test — stealth browser against bot-detection sites.
 *
 * Usage:
 *   npx ts-node -P tsconfig.json scripts/smoke-test-stealth.ts
 *
 * What it checks:
 *   1. bot.sannysoft.com   — Chrome automation flags (webdriver, plugins, permissions, etc.)
 *   2. pixelscan.net       — IP/fingerprint consistency score
 *
 * Exit code 0 = all checks passed, 1 = one or more checks failed.
 */

import { chromium } from 'playwright-extra';
import type { BrowserContext } from 'playwright';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
// Playwright handles UA spoofing correctly via context options.
// The stealth user-agent-override evasion intercepts that and replaces it with
// the real browser UA, breaking our profile spoofing — disable it.
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  passed: boolean;
  value?: string;
}

interface SiteReport {
  site: string;
  url: string;
  checks: CheckResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function pass(name: string, value?: string): CheckResult {
  return { name, passed: true, value };
}

function fail(name: string, value?: string): CheckResult {
  return { name, passed: false, value };
}

function printReport(report: SiteReport): void {
  const allPassed = report.checks.every((c) => c.passed);
  const icon = allPassed ? '✅' : '⚠️ ';
  console.log(`\n${icon} ${report.site}  (${report.url})`);
  console.log('─'.repeat(60));
  for (const c of report.checks) {
    const mark = c.passed ? '  PASS' : '  FAIL';
    const detail = c.value ? `  → ${c.value}` : '';
    console.log(`${mark}  ${c.name}${detail}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared stealth configuration
// ─────────────────────────────────────────────────────────────────────────────

// Must match the installed Playwright Chromium major version — canvas/V8 fingerprints
// are tied to the real engine; claiming an older version causes a detectable hash mismatch.
const SMOKE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

// HTTP-level Sec-CH-UA headers for the smoke test contexts.
// Without these the browser sends its native header: "HeadlessChrome";v="147"
const SMOKE_SEC_CH_UA_HEADERS = {
  'sec-ch-ua': '"Google Chrome";v="147", "Chromium";v="147", "Not/A)Brand";v="99"',
  'sec-ch-ua-platform': '"macOS"',
  'sec-ch-ua-mobile': '?0',
};

/** Patch navigator.userAgentData so Client Hints (brands, platform) match the spoofed UA. */
async function patchUserAgentData(context: BrowserContext): Promise<void> {
  const match = SMOKE_UA.match(/Chrome\/(\d+)\./);
  const version = match ? parseInt(match[1], 10) : 147;
  await context.addInitScript(
    (args: { version: number; platform: string }) => {
      const { version: v, platform } = args;
      const brands = [
        { brand: 'Google Chrome', version: String(v) },
        { brand: 'Chromium', version: String(v) },
        { brand: 'Not/A)Brand', version: '99' },
      ];
      const uad = {
        brands,
        mobile: false,
        platform,
        toJSON: () => ({ brands, mobile: false, platform }),
        getHighEntropyValues: (hints: string[]): Promise<Record<string, unknown>> => {
          const map: Record<string, unknown> = {
            architecture: 'x86',
            bitness: '64',
            brands,
            fullVersionList: brands.map((b) => ({ brand: b.brand, version: `${b.version}.0.0.0` })),
            mobile: false,
            model: '',
            platform,
            platformVersion: '15.0.0',
            uaFullVersion: `${v}.0.0.0`,
          };
          return Promise.resolve(Object.fromEntries(hints.map((h) => [h, map[h] ?? ''])));
        },
      };
      try {
        Object.defineProperty(navigator, 'userAgentData', {
          get: () => uad,
          configurable: true,
          enumerable: true,
        });
      } catch (_) {
        const existing = (navigator as unknown as Record<string, unknown>).userAgentData as Record<string, unknown> | null;
        if (existing) {
          try { Object.assign(existing, uad); } catch (_2) { /* best-effort */ }
        }
      }
    },
    { version, platform: 'macOS' },
  );
}

/**
 * Patch the set of headless-specific signals that fingerprint scanners use to
 * label a browser as "Incognito Window" or "automation":
 *   1. outerHeight == innerHeight  → add fake browser chrome height (85px)
 *   2. screen.availHeight == screen.height  → subtract macOS menu bar (25px)
 *   3. navigator.storage.persist() returns false  → return true
 */
async function patchHeadlessSignals(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    // ── 1. Browser chrome height ─────────────────────────────────────────
    const CHROME_H = 85;
    try {
      Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + CHROME_H, configurable: true });
      Object.defineProperty(window, 'outerWidth',  { get: () => window.innerWidth, configurable: true });
    } catch (_) { /* already immutable */ }

    // ── 2. macOS menu bar (screen.availHeight should be screen.height - 25) ─
    const MENU_BAR = 25;
    try {
      const realH = window.screen.height;
      Object.defineProperty(window.screen, 'availHeight', { get: () => realH - MENU_BAR, configurable: true });
      Object.defineProperty(window.screen, 'availTop',    { get: () => MENU_BAR,          configurable: true });
    } catch (_) { /* already immutable */ }

    // ── 3. storage.persist() — always false in incognito ────────────────
    try {
      Object.defineProperty(navigator.storage, 'persist', {
        value: () => Promise.resolve(true),
        writable: false,
        configurable: true,
      });
    } catch (_) { /* already immutable or unavailable */ }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Site-specific scrapers
// ─────────────────────────────────────────────────────────────────────────────

async function testSannysoft(headless: boolean): Promise<SiteReport> {
  const url = 'https://bot.sannysoft.com';
  const checks: CheckResult[] = [];

  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  try {
    const context = await browser.newContext({
      userAgent: SMOKE_UA,
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: SMOKE_SEC_CH_UA_HEADERS,
    });
    await patchUserAgentData(context);
    await patchHeadlessSignals(context);

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Give the page a moment to run its JS checks
    await page.waitForTimeout(2000);

    // bot.sannysoft.com renders a table with IDs like #webdriver-result
    // Green cells contain "ok" or similar text; red cells contain "Automation"/"detected"
    type CellInfo = { id: string; text: string; color: string };

    const cells: CellInfo[] = await page.evaluate(() => {
      const results: CellInfo[] = [];
      document.querySelectorAll('td[id]').forEach((td) => {
        results.push({
          id: td.id,
          text: td.textContent?.trim() ?? '',
          color: (td as HTMLElement).style.background || window.getComputedStyle(td).background,
        });
      });
      return results;
    });

    // Map: friendly check name → actual element ID on the page
    const critical: Array<{ name: string; id: string }> = [
      { name: 'webdriver',          id: 'webdriver-result' },
      { name: 'webdriver-advanced', id: 'advanced-webdriver-result' },
      { name: 'chrome-obj',         id: 'chrome-result' },
      { name: 'permissions',        id: 'permissions-result' },
      { name: 'plugins-length',     id: 'plugins-length-result' },
      { name: 'plugins-type',       id: 'plugins-type-result' },
      { name: 'languages',          id: 'languages-result' },
    ];

    for (const { name, id } of critical) {
      const cell = cells.find((c) => c.id === id);
      if (!cell) {
        checks.push(fail(name, 'element not found'));
        continue;
      }

      const isBad =
        cell.text.toLowerCase().includes('detected') ||
        cell.text.toLowerCase().includes('automation') ||
        cell.color.includes('red') ||
        cell.color.includes('255, 0, 0');

      checks.push(isBad ? fail(name, cell.text) : pass(name, cell.text));
    }

    if (checks.length === 0) {
      checks.push(fail('page-loaded', 'no result cells found — page structure may have changed'));
    }
  } finally {
    await browser.close();
  }

  return { site: 'bot.sannysoft.com', url, checks };
}

async function testPixelscan(headless: boolean): Promise<SiteReport> {
  const url = 'https://pixelscan.net';
  const checks: CheckResult[] = [];

  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  try {
    const context = await browser.newContext({
      userAgent: SMOKE_UA,
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: SMOKE_SEC_CH_UA_HEADERS,
    });
    await patchUserAgentData(context);
    await patchHeadlessSignals(context);

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Click "Scan My Browser Now" to trigger the scan
    await page.click('text=Scan My Browser Now');

    // Wait for the scan results page to render (navigates to /fingerprint-check)
    await page.waitForURL('**/fingerprint-check', { timeout: 15_000 });
    await page.waitForSelector('.consistency-check', { timeout: 15_000 });
    await page.waitForTimeout(2000);

    // ── Fingerprint consistency (top-level result) ──────────────────────────
    const consistencySection = await page
      .locator('.consistency-check')
      .textContent({ timeout: 5000 })
      .catch(() => null);

    if (consistencySection) {
      const isInconsistent = consistencySection.toLowerCase().includes('inconsistent');
      checks.push(
        isInconsistent
          ? fail('fingerprint-consistency', 'inconsistent fingerprint detected')
          : pass('fingerprint-consistency', 'consistent'),
      );
    } else {
      checks.push(fail('fingerprint-consistency', 'could not locate .consistency-check element'));
    }

    // ── Per-card checks (Bot check, Fingerprint masking) ───────────────────
    type CardInfo = { label: string; value: string };
    const cards: CardInfo[] = await page.evaluate(() => {
      const result: CardInfo[] = [];
      document.querySelectorAll('.checker-card-wrapper').forEach((wrapper) => {
        const label = wrapper.querySelector('.checker-card__label')?.textContent?.trim() ?? '';
        const value = wrapper.querySelector('.checker-card__value-wrapper')?.textContent?.trim() ?? '';
        if (label) result.push({ label, value });
      });
      return result;
    });

    // Bot check
    const botCard = cards.find((c) => c.label.toLowerCase().includes('bot'));
    if (botCard) {
      const isBotDetected = !botCard.value.toLowerCase().includes('no automated');
      checks.push(
        isBotDetected
          ? fail('bot-check', botCard.value)
          : pass('bot-check', botCard.value),
      );
    } else {
      checks.push(fail('bot-check', 'card not found'));
    }

    // Fingerprint masking (stealth detection)
    const fpCard = cards.find((c) => c.label.toLowerCase().includes('fingerprint'));
    if (fpCard) {
      const isMasked = fpCard.value.toLowerCase().includes('masking');
      checks.push(
        isMasked
          ? fail('fingerprint-masking', fpCard.value)
          : pass('fingerprint-masking', fpCard.value),
      );
    } else {
      checks.push(fail('fingerprint-masking', 'card not found'));
    }
  } finally {
    await browser.close();
  }

  return { site: 'pixelscan.net', url, checks };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fingerprint diversity test (offline — no network needed)
// ─────────────────────────────────────────────────────────────────────────────

function testFingerprintDiversity(): SiteReport {
  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  ];
  const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 },
  ];
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const samples = Array.from({ length: 10 }, () => ({
    ua: pick(USER_AGENTS),
    viewport: pick(VIEWPORTS),
  }));

  const uniqueUAs = new Set(samples.map((s) => s.ua)).size;
  const uniqueVPs = new Set(samples.map((s) => `${s.viewport.width}x${s.viewport.height}`)).size;

  const checks: CheckResult[] = [
    uniqueUAs >= 2
      ? pass('ua-diversity', `${uniqueUAs}/10 unique user-agents`)
      : fail('ua-diversity', `only ${uniqueUAs} distinct user-agents in 10 samples`),

    uniqueVPs >= 2
      ? pass('viewport-diversity', `${uniqueVPs}/10 unique viewports`)
      : fail('viewport-diversity', `only ${uniqueVPs} distinct viewports in 10 samples`),
  ];

  return { site: 'fingerprint-diversity (offline)', url: 'n/a', checks };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const headless = process.env.HEADLESS !== 'false';
  const skipNetwork = process.env.SKIP_NETWORK === 'true';

  console.log('='.repeat(60));
  console.log('  Phase 2 — Stealth Browser Smoke Test');
  console.log(`  headless: ${headless}   skip-network: ${skipNetwork}`);
  console.log('='.repeat(60));

  const reports: SiteReport[] = [];

  // Always run the offline fingerprint diversity check
  reports.push(testFingerprintDiversity());

  if (!skipNetwork) {
    try {
      reports.push(await testSannysoft(headless));
    } catch (err) {
      console.error('\n[ERROR] bot.sannysoft.com test threw:', err);
      reports.push({
        site: 'bot.sannysoft.com',
        url: 'https://bot.sannysoft.com',
        checks: [fail('test-execution', String(err))],
      });
    }

    try {
      reports.push(await testPixelscan(headless));
    } catch (err) {
      console.error('\n[ERROR] pixelscan.net test threw:', err);
      reports.push({
        site: 'pixelscan.net',
        url: 'https://pixelscan.net',
        checks: [fail('test-execution', String(err))],
      });
    }
  }

  for (const report of reports) {
    printReport(report);
  }

  const totalChecks = reports.flatMap((r) => r.checks).length;
  const passedChecks = reports.flatMap((r) => r.checks).filter((c) => c.passed).length;

  console.log('\n' + '='.repeat(60));
  console.log(`  Result: ${passedChecks}/${totalChecks} checks passed`);
  console.log('='.repeat(60));

  if (passedChecks < totalChecks) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
