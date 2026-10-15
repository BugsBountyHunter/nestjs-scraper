/**
 * Captures real LinkedIn HTML pages and saves them as fixture files
 * for use in parser unit tests.
 *
 * Usage:
 *   npx ts-node -P tsconfig.json scripts/capture-fixtures.ts
 *   HEADLESS=false npx ts-node -P tsconfig.json scripts/capture-fixtures.ts
 *
 * Output:
 *   src/pipeline/parsers/__fixtures__/jobs.html
 *   src/pipeline/parsers/__fixtures__/profile.html   (if accessible)
 *   src/pipeline/parsers/__fixtures__/company.html   (if accessible)
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import type { BrowserContext } from 'playwright';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

dotenv.config({ path: path.join(__dirname, '../.env') });

const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

const HEADLESS = process.env.HEADLESS !== 'false';
const PROXY_POOL = process.env.PROXY_POOL ?? '';
const FIXTURES_DIR = path.join(__dirname, '../src/pipeline/parsers/__fixtures__');

const TARGETS = [
  {
    name: 'jobs',
    url: process.env.FIXTURE_JOBS_URL ?? 'https://www.linkedin.com/jobs/search/?keywords=software+engineer&location=Remote',
    file: 'jobs.html',
  },
  {
    name: 'profile',
    url: process.env.FIXTURE_PROFILE_URL ?? `https://www.linkedin.com/in/${process.env.LINKEDIN_PROFILE_ID ?? 'ahmed-saber-1b549ab4'}/`,
    file: 'profile.html',
  },
  {
    name: 'company',
    url: process.env.FIXTURE_COMPANY_URL ?? 'https://www.linkedin.com/company/google/',
    file: 'company.html',
  },
];

interface ParsedProxy { url: string; user: string; pass: string; }

function parseProxy(raw: string): ParsedProxy | undefined {
  if (!raw.trim()) return undefined;
  const first = raw.split(',')[0].trim();
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(first)) {
    const u = new URL(first);
    return { url: `${u.protocol}//${u.host}`, user: decodeURIComponent(u.username), pass: decodeURIComponent(u.password) };
  }
  const atIdx = first.lastIndexOf('@');
  if (atIdx !== -1) {
    const creds = first.slice(0, atIdx);
    const colonIdx = creds.indexOf(':');
    return { url: `http://${first.slice(atIdx + 1)}`, user: creds.slice(0, colonIdx), pass: creds.slice(colonIdx + 1) };
  }
  return { url: `http://${first}`, user: '', pass: '' };
}

async function launchContext(proxy?: ParsedProxy): Promise<BrowserContext> {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-capture-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: HEADLESS,
    timeout: 30_000,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    ...(proxy && { proxy: { server: proxy.url, username: proxy.user, password: proxy.pass } }),
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  return ctx;
}

async function capture(name: string, url: string, file: string, proxy?: ParsedProxy): Promise<void> {
  console.log(`\n[${name}] Fetching ${url}`);
  const ctx = await launchContext(proxy);
  const page = await ctx.newPage();

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const status = response?.status() ?? 0;
    console.log(`[${name}] Status: ${status}`);

    // Wait a moment for dynamic content
    await new Promise((r) => setTimeout(r, 3000));

    const html = await page.content();
    const outPath = path.join(FIXTURES_DIR, file);
    fs.writeFileSync(outPath, html, 'utf8');

    const kb = Math.round(html.length / 1024);
    console.log(`[${name}] Saved ${kb} KB → ${outPath}`);

    if (status === 999) {
      console.log(`[${name}] ⚠  Status 999 — LinkedIn soft block. HTML may be minimal. Try with a residential proxy.`);
    }
  } catch (err) {
    console.error(`[${name}] Failed:`, err instanceof Error ? err.message : err);
  } finally {
    await page.close().catch(() => undefined);
    await ctx.close().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════');
  console.log('  LinkedIn Fixture Capture');
  console.log('═══════════════════════════════════════');

  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  const proxy = parseProxy(PROXY_POOL);
  if (proxy) {
    console.log(`Using proxy: ${proxy.url}`);
  } else {
    console.log('No proxy — fetching directly');
  }

  for (const target of TARGETS) {
    await capture(target.name, target.url, target.file, proxy);
  }

  console.log('\nDone. Fixture files saved to:');
  console.log(`  ${FIXTURES_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
