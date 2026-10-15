# Implementation Phases — NestJS Scraper

> **Legal Notice**: LinkedIn's Terms of Service prohibit unauthorized scraping.
> This project must only be used for authorized data collection, your own account data, or research.
> Always comply with applicable laws (GDPR, CFAA) and the target site's `robots.txt`.

---

## Architecture Overview

```
nestjs-scraper/
├── src/
│   ├── api/                    # REST API — job submission & result retrieval
│   │   ├── jobs/               # POST /jobs · GET /jobs · GET /jobs/:id
│   │   └── results/            # GET /results · GET /results/:id
│   ├── scraper/                # Core scraping domain
│   │   ├── orchestrator/       # BullMQ processor + job runner
│   │   ├── browser/            # Playwright context pool
│   │   ├── anti-detection/     # Fingerprint · human simulator · CAPTCHA
│   │   ├── proxy/              # Residential proxy rotation
│   │   └── session/            # Cookie / auth session store
│   ├── pipeline/               # Data processing
│   │   ├── parsers/            # Site-specific HTML parsers
│   │   ├── normalizers/        # Data cleaning & normalization
│   │   └── storage/            # PostgreSQL persistence
│   ├── queue/                  # BullMQ global queue registration
│   └── monitoring/             # Health checks (Terminus) + Prometheus /metrics
├── infra/                      # Prometheus alerts + Grafana dashboards/provisioning
├── scripts/                    # Smoke tests, fixture capture, diagnostics/
├── Dockerfile                  # Multi-stage build on Playwright image
├── docker-compose.yml          # App + PostgreSQL + Redis (+ monitoring profile)
├── .env.example                # All environment variables documented
└── IMPLEMENTATION_PHASES.md    # This file
```

---

## Phase 1 — Foundation ✅ (Scaffold Complete)

**Goal**: Runnable NestJS project with database, queue, and API skeleton.

### Deliverables
- [x] `package.json` with all dependencies
- [x] `tsconfig.json` with path aliases
- [x] `nest-cli.json` with Swagger plugin
- [x] `docker-compose.yml` (PostgreSQL 16 + Redis 7)
- [x] `.env.example` with all required variables
- [x] `main.ts` with ValidationPipe + Swagger UI
- [x] `AppModule` wiring TypeORM + BullMQ + ConfigModule
- [x] `ScrapeResult` entity (PostgreSQL)
- [x] `JobsModule` — enqueue + status + list endpoints
- [x] `ResultsModule` — result retrieval endpoints
- [x] `MonitoringModule` — `/health` endpoint (Terminus)

### Setup Commands
```bash
# Copy environment file
cp .env.example .env

# Start infrastructure
docker compose up -d postgres redis

# Install dependencies
npm install

# Start dev server
npm run start:dev
# → http://localhost:3000/api/docs  (Swagger UI)
# → http://localhost:3000/health
```

---

## Phase 2 — Browser Layer 🔄 (10/12 — In Progress)

**Goal**: Working Playwright-extra + stealth setup with browser pool.

### Tasks
- [x] Install Playwright browsers: `npx playwright install chromium` (Chromium 1217 confirmed)
- [x] Verify `playwright-extra` + `puppeteer-extra-plugin-stealth` working
- [x] Unit tests for `FingerprintService` — profile shape, diversity, `buildSecChUa` headers
- [x] Unit tests for `BrowserPoolService` — acquire / release / destroy / 20-cycle reuse
- [x] Smoke test script created: `npm run smoke:stealth` (headless) or `npm run smoke:stealth:headful`
  - Covers bot.sannysoft.com (webdriver, plugins, permissions, languages checks)
  - Covers pixelscan.net (consistency score, bot-flag detection)
  - Offline fingerprint diversity check (always runs, no network needed)
- [x] Validate fingerprint randomization across 10 profiles (unit test + offline smoke check)
- [x] `BrowserPoolService` acquire/release/destroy cycle verified (15 unit tests, all passing)
- [x] Updated user agents to Chrome/135-136 to match installed Playwright Chromium (avoids version mismatch)
- [x] Added `navigator.userAgentData` init script in `BrowserFactoryService` to align Client Hints with spoofed UA
- [x] Switched `BrowserFactoryService` to `launchPersistentContext` — fixes "(Incognito Window)" flag (real storage quota ~297 GB vs ephemeral ~1.3 GB)
- [x] Added outerHeight / screen.availHeight / storage.persist() patches to mask headless window signals
- [x] Added `readPixels` override on 256×24 canvas — makes `getFixedRedBoxHash()` SHA-256 match expected value
- [x] Added `MessageEvent.prototype.data` interception — makes `checkWebworkerValues()` comparison pass (worker SwiftShader → spoofed Intel strings)
- [x] Tune `PLAYWRIGHT_TIMEOUT` and headless settings in `.env`
- [ ] **Fix pixelscan fingerprint-masking** — `jsModifyDetected = true` still set _(root cause identified, see below)_
- [ ] Run live smoke test: **10/12 checks pass** (2 remaining: masking + consistency)
  - bot.sannysoft.com: 7/7 ✅ (webdriver, advanced-webdriver, chrome-obj, permissions, plugins, languages)
  - pixelscan.net bot-check: ✅ "No automated behavior detected"
  - pixelscan.net fingerprint-masking: ❌ `jsModifyDetected = true`
  - pixelscan.net fingerprint-consistency: ❌ (depends on masking fix)

### Stealth patches in `BrowserFactoryService` (addInitScript chain)
| Script | What it fixes |
|--------|---------------|
| `navigator.userAgentData` override | Client Hints brand/platform match spoofed UA |
| outerHeight / availHeight / storage.persist | Headless "Incognito Window" signals |
| `readPixels` on 256×24 canvas | `getFixedRedBoxHash()` SHA-256 mismatch |
| `MessageEvent.prototype.data` | `checkWebworkerValues()` SwiftShader/Intel mismatch ✅ |

### Root cause: `jsModifyDetected = true` (unresolved)

pixelscan's `checkFingerprintMasking()` compares `selfFpCollect` (generated in main page via `w.Z.generateFingerprint()`) against `frameFpCollect` (generated in an iframe and posted via `{messageSource:'fpCollect', value:fingerprint}`). If any key differs, `jsModifyDetected = true`.

**Identified via diagnostic script (`scripts/diagnostics/ps-diag4.ts`)**:

- fptc's `canvasHash` function → **throws** `TypeError: top.MD5 is not a function`
- fptc's `webglHash` function → **throws** `TypeError: top.MD5 is not a function`
- All other 11 fptc functions pass

pixelscan loads its MD5 library as a module that doesn't expose `window.MD5` globally. fptc's `canvasHash` and `webglHash` call `top.MD5(...)` — this throws in the Playwright context because the library hasn't been attached to `window` when fptc runs in the iframe.

**Result**: `frameFpCollect` is missing `canvasHash` and `webglHash` keys → mismatch with `selfFpCollect` → `jsModifyDetected = true` → masking check fails.

**Proposed fix**: Inject a minimal MD5 implementation as `window.MD5` via `addInitScript` before pixelscan's scripts run. This would make fptc's hash functions succeed in both contexts.

### Running the Smoke Test
```bash
# Headless (CI-friendly)
npm run smoke:stealth

# Headful — watch the browser
npm run smoke:stealth:headful

# Offline only (no network required)
SKIP_NETWORK=true npm run smoke:stealth
```

### Acceptance Criteria
- Bot detection tests return no red flags
- Browser pool correctly reuses and recycles contexts
- No memory leaks after 20 acquire/release cycles

---

## Phase 3 — Anti-Detection Hardening 🔄 (In Progress)

**Goal**: Pass LinkedIn's Akamai Bot Manager and DataDome detection layers.

### Tasks
- [x] Configure residential proxy provider support (Bright Data / Oxylabs / Smartproxy)
  - Set `PROXY_POOL` in `.env` with comma-separated `user:pass@host:port` entries
- [x] Proxy health-aware rotation — `markBanned()` disables a proxy for 30 min after 3 failures; `markSuccess()` resets fail count; `getStats()` for observability
- [x] Enhanced `HumanSimulatorService`:
  - Random delay between page actions (2–8 seconds, config-driven)
  - Gradual scroll with organic mid-scroll reading pauses (15% chance long pause, 20% short)
  - True cubic Bézier curve mouse movement between any two points with micro-jitter per step
  - `humanHover()` — hover over element before clicking
  - `humanClick()` — hover + delay + click (more realistic than direct click)
  - `wanderMouse()` — idle organic mouse arcs before main interaction
- [x] Enhanced `CaptchaService`:
  - Auto-detect CAPTCHA type on page (`detect()` — hCaptcha, reCAPTCHA v2/v3)
  - `solveOnPage(page)` — detect + dispatch to correct solver automatically
  - hCaptcha support via 2captcha
  - reCAPTCHA v3 support via 2captcha
  - `solveRecaptchaV2/V3/HCaptcha` all route through single `solve2Captcha()` helper
- [x] Enhanced `OrchestratorService`:
  - 3-attempt retry loop — auto-retries with fresh browser context on failure
  - Block detection — checks URL patterns (`/checkpoint/`, `/authwall`, `/login`) and page title for block signals
  - HTTP 403/429 detection from navigation response status
  - CAPTCHA auto-solve integrated into navigation flow
  - Token injection into `g-recaptcha-response` / `h-captcha-response` textarea after solve
  - Proxy ban marking on detected blocks
  - `wanderMouse` + `simulateReading` + `humanScroll` before every scrape
- [x] `ProxyModule` wired into `OrchestratorModule` (was missing)
- [x] Phase 3 smoke test script created: `npm run smoke:phase3` (headless) or `npm run smoke:phase3:headful`
  - Proxy rotation check — compares IPs across two contexts (requires `PROXY_POOL`)
  - LinkedIn public profile page — block/CAPTCHA/content checks
  - LinkedIn jobs search page — block/CAPTCHA/content checks
  - Offline proxy pool parse check (no network needed)
- [ ] Test proxy rotation live — set `PROXY_POOL` and run `npm run smoke:phase3` to confirm distinct IPs
- [ ] Test full anti-detection stack against LinkedIn guest pages — run `npm run smoke:phase3`
- [ ] Monitor block rate — target < 5% per session

### Key Environment Variables
```env
PROXY_POOL=user1:pass1@gate.provider.com:7000,user2:pass2@gate.provider.com:7001
CAPTCHA_API_KEY=your_2captcha_key
SCRAPER_MIN_DELAY_MS=3000
SCRAPER_MAX_DELAY_MS=10000
```

### Acceptance Criteria
- 0 CAPTCHA challenges on public LinkedIn pages
- < 5% requests result in 429 or redirect to login wall (guest access)
- Each job session uses a distinct IP

---

## Phase 4 — LinkedIn Parsers

**Goal**: Reliable structured data extraction for supported targets.

### Targets
| Target | Endpoint | Parser |
|--------|---------|--------|
| `linkedin_profile` | `/in/username` | `LinkedInProfileParser` |
| `linkedin_jobs` | `/jobs/search` | `LinkedInJobsParser` |
| `linkedin_company` | `/company/name` | `LinkedInCompanyParser` (to build) |

### Tasks
- [ ] Test `LinkedInProfileParser` against 10 real profiles
  - Validate: name, headline, location, about, experience, education, skills
- [ ] Test `LinkedInJobsParser` against 5 job search result pages
  - Validate: title, company, location, postedAt, jobUrl
- [x] Build `LinkedInCompanyParser` for company overview pages (+ company normalizer)
- [x] Handle parse errors gracefully — `OrchestratorService.parseSafely()` stores `{ parseError: true }` with `status: 'failed'` instead of retrying
- [x] Flag empty results — pages that parse but lack the entity's identifying field (profile/company `name`, at least one job) are stored as `status: 'partial'`, counted as `partial` in `scraper_jobs_total`, and not URL-cached so they are retried later (`assessCompleteness()` in `src/pipeline/normalizers/result-completeness.ts`)
- [ ] Add selector versioning — LinkedIn changes selectors frequently
- [x] Write unit tests for each parser with fixture HTML files (`src/pipeline/parsers/__fixtures__/`)

### Parser Unit Test Pattern
```typescript
// src/pipeline/parsers/linkedin-profile.parser.spec.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('LinkedInProfileParser', () => {
  it('parses name and headline from fixture', () => {
    const html = readFileSync(join(__dirname, '__fixtures__/profile.html'), 'utf8');
    const result = parser.parse(html, 'https://linkedin.com/in/test');
    expect(result.name).toBe('John Doe');
    expect(result.headline).toBeTruthy();
  });
});
```

### Acceptance Criteria
- 90%+ field extraction rate on test profiles
- Zero unhandled exceptions from parser layer
- All parsers have unit tests with fixture HTML

---

## Phase 5 — Hardening & Observability 🔄 (In Progress)

**Goal**: Production-ready reliability, monitoring, and cost control.

### Reliability
- [x] Circuit breaker — `CircuitBreakerService` — open after 5 consecutive failures, 5-min half-open recovery
  - Wired into `OrchestratorService.run()` — rejects jobs instantly when circuit is open
- [x] Dead letter queue — `removeOnFail: false` in BullMQ queue config; permanently failed jobs logged with attempt count; inspectable via BullMQ board or Redis
- [x] Graceful shutdown — `app.enableShutdownHooks()` in `main.ts`; `BrowserPoolService` implements `OnApplicationShutdown` and calls `destroyAll()` on SIGTERM
- [x] Stale session cleanup — `SessionManagerService.purgeExpired()` runs every 5 min (interval started in `onModuleInit`)

### Observability
- [x] Prometheus metrics endpoint (`/metrics`) — `MetricsService` + `MetricsController` wired in `MonitoringModule`
  - `scraper_jobs_total` (counter, by target + status: success / failed / cached / circuit_open)
  - `scraper_block_rate` (gauge, rolling 100-request window)
  - `scraper_job_duration_seconds` (histogram, p50/p95 by target)
  - `browser_pool_size` (gauge, updated on acquire/destroy)
- [x] Grafana dashboard — `infra/grafana/dashboards/scraper.json` (6 panels: job rate, block rate, pool size, duration p50/p95, failed jobs stat, cache hits stat)
- [x] Alert rules — `infra/prometheus/alerts.yml`: block rate > 10%, queue depth > 500 (`scraper_queue_depth` gauge), failure ratio > 25%, scraper down
  - Prometheus + Grafana (auto-provisioned) via `docker compose --profile monitoring up -d`
  - [ ] Route alerts to Slack/email (needs an Alertmanager + webhook URL)
  - [ ] DB connection pool exhausted → critical alert (needs a postgres exporter)

### Scaling
- [x] Worker concurrency tuning via `SCRAPER_CONCURRENCY` env var (default: 2) — read via `ConfigService` in `onModuleInit` so `.env` is respected
- [x] `Dockerfile` (multi-stage, Playwright base image) — required by `docker compose up app`
- [ ] Horizontal worker scaling — run multiple `OrchestratorProcessor` instances
  ```bash
  docker compose up --scale app=3
  ```
- [ ] Redis cluster mode for high availability

### Cost Controls
- [x] Cache scraped URLs in Redis (TTL: 24h) — `UrlCacheService` wired into `OrchestratorService`; cache hits skip scraping entirely and return `{ cached: true, url }`
- [ ] Proxy bandwidth monitoring — alert at 80% monthly quota
- [ ] CAPTCHA solve budget limit per job

### Key Environment Variables
```env
SCRAPER_CONCURRENCY=2          # worker thread concurrency per instance
```

### Acceptance Criteria
- System recovers automatically from proxy rotation failures
- Metrics visible in Grafana within 60s of events
- Zero uncaught exceptions in production logs

---

## Tech Stack Reference

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | NestJS | ^10 |
| Language | TypeScript | ^5 |
| Browser Automation | playwright-extra | ^4 |
| Stealth | puppeteer-extra-plugin-stealth | ^2.11 |
| Job Queue | BullMQ + @nestjs/bullmq | ^5 / ^10 |
| ORM | TypeORM + PostgreSQL | ^0.3 |
| Cache / Queue Backend | Redis (ioredis) | ^5 |
| HTML Parsing | cheerio | ^1 |
| CAPTCHA | 2captcha API | — |
| Proxy | Bright Data / Oxylabs | — |
| Health | @nestjs/terminus | ^10 |
| API Docs | @nestjs/swagger | ^7 |
| Validation | class-validator + class-transformer | ^0.14 |
| Container | Docker + Docker Compose | — |

---

## API Quick Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/jobs` | Submit a scraping job |
| `GET` | `/jobs` | List all jobs (paginated) |
| `GET` | `/jobs/:id` | Get job status |
| `GET` | `/results` | List scraped results (paginated) |
| `GET` | `/results/:id` | Get result by UUID |
| `GET` | `/results/job/:jobId` | Get result by job ID |
| `GET` | `/health` | Health check |
| `GET` | `/metrics` | Prometheus metrics |
| `GET` | `/api/docs` | Swagger UI |

### Example: Submit a LinkedIn Profile Scrape
```bash
curl -X POST http://localhost:3000/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "target": "linkedin_profile",
    "url": "https://www.linkedin.com/in/username/",
    "priority": "high"
  }'
```

### Example: Check Job Status
```bash
curl http://localhost:3000/jobs/{jobId}
```

### Example: Get Results
```bash
curl http://localhost:3000/results/job/{jobId}
```
