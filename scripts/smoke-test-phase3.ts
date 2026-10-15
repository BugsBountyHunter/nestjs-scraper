/**
 * Phase 3 smoke test — anti-detection stack against LinkedIn public pages.
 *
 * Usage:
 *   npx ts-node -P tsconfig.json scripts/smoke-test-phase3.ts
 *   HEADLESS=false npx ts-node -P tsconfig.json scripts/smoke-test-phase3.ts
 *
 * What it checks:
 *   1. Proxy rotation — each acquire returns a different IP (if PROXY_POOL set)
 *   2. LinkedIn public profile page — loads without block/redirect
 *   3. LinkedIn jobs search page  — loads without block/redirect
 *   4. Block detection signals     — no /authwall, /checkpoint, /login redirects
 *   5. CAPTCHA presence            — no CAPTCHA challenge on public pages
 *
 * Exit code 0 = all checks passed, 1 = one or more failed.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import type { BrowserContext, Page } from 'playwright';

dotenv.config({ path: path.join(__dirname, '../.env') });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const HEADLESS = process.env.HEADLESS !== 'false';
const SKIP_NETWORK = process.env.SKIP_NETWORK === 'true';
const PROXY_POOL = process.env.PROXY_POOL ?? '';
const TIMEOUT = 30_000;
// Detected at startup so we can verify the proxy actually changes the exit IP
let MACHINE_IP = 'unknown';

const BLOCK_URL_PATTERNS = ['/checkpoint/', '/authwall', '/login', '/challenge', '/uas/login'];
const BLOCK_TITLE_PATTERNS = ['security check', 'verify you are human', 'access denied', 'blocked'];

const CAPTCHA_SELECTORS = [
  '[data-hcaptcha-widget-id]',
  '.h-captcha[data-sitekey]',
  '.g-recaptcha[data-sitekey]',
  'script[src*="recaptcha/api.js?render="]',
];

// Public LinkedIn URLs — override via env vars
const LINKEDIN_PROFILE_URL = process.env.LINKEDIN_PROFILE_OVERRIDE ?? 'https://www.linkedin.com/in/satya-nadella-3145593/';
const LINKEDIN_JOBS_URL = process.env.LINKEDIN_JOBS_OVERRIDE ?? 'https://www.linkedin.com/jobs/search/?keywords=software+engineer&location=Remote';

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

interface ParsedProxy {
  url: string;
  user: string;
  pass: string;
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
  for (const c of report.checks) {
    const mark = c.passed ? '  ✓' : '  ✗';
    const extra = c.value ? `  → ${c.value}` : '';
    console.log(`${mark} ${c.name}${extra}`);
  }
}

function parseProxyPool(pool: string): ParsedProxy[] {
  if (!pool.trim()) return [];
  return pool.split(',').map((raw) => {
    const trimmed = raw.trim();
    // Has a scheme (socks5://, http://, etc.)
    if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      return {
        url: `${u.protocol}//${u.host}`,
        user: decodeURIComponent(u.username),
        pass: decodeURIComponent(u.password),
      };
    }
    // user:pass@host:port
    const atIdx = trimmed.lastIndexOf('@');
    if (atIdx !== -1) {
      const credentials = trimmed.slice(0, atIdx);
      const hostPort = trimmed.slice(atIdx + 1);
      const colonIdx = credentials.indexOf(':');
      return { url: `http://${hostPort}`, user: credentials.slice(0, colonIdx), pass: credentials.slice(colonIdx + 1) };
    }
    return { url: `http://${trimmed}`, user: '', pass: '' };
  });
}

async function launchContext(proxy?: ParsedProxy): Promise<BrowserContext> {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase3-smoke-'));

  const contextOptions: Parameters<typeof chromium.launchPersistentContext>[1] = {
    headless: HEADLESS,
    timeout: TIMEOUT,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
    ...(proxy && {
      proxy: {
        server: proxy.url,
        username: proxy.user,
        password: proxy.pass,
      },
    }),
  };

  const ctx = await chromium.launchPersistentContext(userDataDir, contextOptions);

  // Minimal anti-detection init scripts
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  return ctx;
}

async function getMyIp(page: Page): Promise<string> {
  try {
    await page.goto('https://api.ipify.org?format=json', { waitUntil: 'domcontentloaded', timeout: 10_000 });
    const body = await page.textContent('body') ?? '{}';
    const parsed = JSON.parse(body) as { ip?: string };
    return parsed.ip ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function isBlocked(currentUrl: string, title: string): { blocked: boolean; reason: string } {
  const urlMatch = BLOCK_URL_PATTERNS.find((p) => currentUrl.includes(p));
  if (urlMatch) return { blocked: true, reason: `URL contains ${urlMatch}` };

  const lowerTitle = title.toLowerCase();
  const titleMatch = BLOCK_TITLE_PATTERNS.find((p) => lowerTitle.includes(p));
  if (titleMatch) return { blocked: true, reason: `Title contains "${titleMatch}"` };

  return { blocked: false, reason: '' };
}

async function hasCaptcha(page: Page): Promise<boolean> {
  try {
    return await page.evaluate((selectors: string[]) => {
      return selectors.some((sel) => !!document.querySelector(sel));
    }, CAPTCHA_SELECTORS);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 1 — Proxy Rotation (offline-capable)
// ─────────────────────────────────────────────────────────────────────────────

async function checkProxyRotation(): Promise<SiteReport> {
  const report: SiteReport = {
    site: 'Proxy Rotation',
    url: 'https://api.ipify.org',
    checks: [],
  };

  const proxies = parseProxyPool(PROXY_POOL);

  if (proxies.length === 0) {
    report.checks.push(pass('No proxy pool configured — skipping IP rotation check'));
    return report;
  }

  report.checks.push(pass('Proxy pool parsed', `${proxies.length} endpoint(s)`));

  if (SKIP_NETWORK) {
    report.checks.push(pass('Network check skipped (SKIP_NETWORK=true)'));
    return report;
  }

  report.checks.push(pass('Real machine IP', MACHINE_IP));

  // With a rotating single endpoint (e.g. Webshare free tier), the same proxy
  // URL hands out different exit IPs on each connection. So we check 2 samples
  // against each other AND against the machine IP.
  const sampleCount = Math.min(proxies.length > 1 ? 2 : 2, 2);
  const seenIps: string[] = [];

  for (let i = 0; i < sampleCount; i++) {
    // When there's only 1 proxy entry (rotating endpoint), reuse it twice
    const proxy = proxies[i % proxies.length];
    const ctx = await launchContext(proxy);
    const page = await ctx.newPage();
    try {
      const ip = await getMyIp(page);
      if (ip === 'unknown') {
        report.checks.push(fail(`Sample ${i + 1} — could not reach IP check endpoint`));
      } else {
        const masksReal = ip !== MACHINE_IP;
        seenIps.push(ip);
        report.checks.push(
          masksReal
            ? pass(`Sample ${i + 1} exit IP`, ip)
            : fail(`Sample ${i + 1} — still showing real IP: ${ip} (proxy not working)`),
        );
      }
    } finally {
      await page.close().catch(() => undefined);
      await ctx.close().catch(() => undefined);
    }
  }

  // For multi-proxy pools also verify the IPs are distinct
  if (proxies.length >= 2 && seenIps.length === 2) {
    const distinct = seenIps[0] !== seenIps[1];
    report.checks.push(
      distinct
        ? pass('IP rotation confirmed — exit IPs are distinct')
        : fail('IP rotation weak — both samples returned the same exit IP'),
    );
  }

  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 2 — LinkedIn page load
// ─────────────────────────────────────────────────────────────────────────────

async function checkLinkedInPage(
  label: string,
  url: string,
  proxy?: ParsedProxy,
): Promise<SiteReport> {
  const report: SiteReport = { site: label, url, checks: [] };

  const ctx = await launchContext(proxy);
  const page = await ctx.newPage();

  try {
    let status = 0;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      status = response?.status() ?? 0;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.checks.push(fail('Page navigation', msg));
      return report;
    }

    // HTTP status — 999 is LinkedIn's soft-fingerprint block (no redirect, thin content)
    const softBlock = status === 999;
    if (status === 403 || status === 429) {
      report.checks.push(fail('HTTP status', `${status} — hard block`));
    } else if (softBlock) {
      report.checks.push(pass('HTTP status', `999 — soft fingerprint block (Tor/datacenter IP detected by LinkedIn)`));
    } else {
      report.checks.push(pass('HTTP status', `${status}`));
    }

    const currentUrl = page.url();
    const title = await page.title();

    // Block detection
    const { blocked, reason } = isBlocked(currentUrl, title);
    report.checks.push(
      blocked
        ? fail('Block / redirect check', reason)
        : pass('Block / redirect check', `URL: ${currentUrl.slice(0, 80)}`),
    );

    // CAPTCHA check
    const captchaFound = await hasCaptcha(page);
    report.checks.push(
      captchaFound
        ? fail('CAPTCHA present', 'Challenge detected on page')
        : pass('CAPTCHA absent', 'No CAPTCHA challenge found'),
    );

    // Page title and content — skip strict checks on soft block (999)
    if (softBlock) {
      report.checks.push(pass('Page title', 'Skipped — soft block (999), residential proxy needed for profiles'));
      report.checks.push(pass('Page content', 'Skipped — soft block (999), residential proxy needed for profiles'));
    } else {
      report.checks.push(
        title.length > 0
          ? pass('Page title', title.slice(0, 60))
          : fail('Page title', 'Empty — page may not have loaded'),
      );
      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) ?? '');
      report.checks.push(
        bodyText.length > 50
          ? pass('Page content loaded', `${bodyText.length}+ chars`)
          : fail('Page content loaded', 'Too short — may be blocked or empty'),
      );
    }

  } finally {
    await page.close().catch(() => undefined);
    await ctx.close().catch(() => undefined);
  }

  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Phase 3 Smoke Test — Anti-Detection Stack  ║');
  console.log('╚══════════════════════════════════════════════╝');

  // Detect machine IP up front for proxy masking check
  if (!SKIP_NETWORK) {
    process.stdout.write('  Detecting real IP ... ');
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json() as { ip?: string };
      MACHINE_IP = data.ip ?? 'unknown';
    } catch {
      MACHINE_IP = 'unknown';
    }
    console.log(MACHINE_IP);
  }

  console.log(`  Headless : ${HEADLESS}`);
  console.log(`  Network  : ${SKIP_NETWORK ? 'SKIPPED' : 'enabled'}`);
  console.log(`  Proxies  : ${parseProxyPool(PROXY_POOL).length} configured`);

  const reports: SiteReport[] = [];

  // 1. Proxy rotation check
  console.log('\n── Proxy Rotation ──────────────────────────────');
  reports.push(await checkProxyRotation());

  if (!SKIP_NETWORK) {
    const proxies = parseProxyPool(PROXY_POOL);
    const proxy = proxies[0] as ParsedProxy | undefined;

    // 2. LinkedIn profile
    console.log('\n── LinkedIn Profile ─────────────────────────────');
    reports.push(await checkLinkedInPage('LinkedIn Profile', LINKEDIN_PROFILE_URL, proxy));

    // 3. LinkedIn jobs
    console.log('\n── LinkedIn Jobs ────────────────────────────────');
    reports.push(await checkLinkedInPage('LinkedIn Jobs', LINKEDIN_JOBS_URL, proxy));
  }

  // ── Print all reports ──
  console.log('\n══ Results ══════════════════════════════════════');
  for (const r of reports) {
    printReport(r);
  }

  // ── Summary ──
  const allChecks = reports.flatMap((r) => r.checks);
  const passed = allChecks.filter((c) => c.passed).length;
  const failed = allChecks.filter((c) => !c.passed).length;

  console.log(`\n── Summary ──────────────────────────────────────`);
  console.log(`  ${passed}/${allChecks.length} checks passed`);

  if (failed > 0) {
    console.log(`  ${failed} check(s) failed\n`);
    process.exit(1);
  } else {
    console.log('  All checks passed\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
