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
│   └── monitoring/             # Health checks (Terminus)
├── docker-compose.yml          # PostgreSQL + Redis
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
cd /Users/ahmedsr/Documents/works/playground/nestjs-scraper

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

## Phase 2 — Browser Layer

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
- [x] Run live smoke test: **10/12 checks pass**
  - bot.sannysoft.com: 7/7 ✅ (webdriver, advanced-webdriver, chrome-obj, permissions, plugins, languages)
  - pixelscan.net bot-check: PASS — "No automated behavior detected"
  - pixelscan.net fingerprint-masking: FAIL — canvas override detected (Phase 3 concern)
  - pixelscan.net fingerprint-consistency: FAIL — caused by canvas masking above (Phase 3 concern)
- [x] Updated user agents to Chrome/135-136 to match installed Playwright Chromium (avoids version mismatch)
- [x] Added `navigator.userAgentData` init script in `BrowserFactoryService` to align Client Hints with spoofed UA
- [ ] Tune `PLAYWRIGHT_TIMEOUT` and headless settings in `.env`

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

## Phase 3 — Anti-Detection Hardening

**Goal**: Pass LinkedIn's Akamai Bot Manager and DataDome detection layers.

### Tasks
- [ ] Configure residential proxy provider (Bright Data / Oxylabs / Smartproxy)
  - Set `PROXY_POOL` in `.env` with comma-separated `user:pass@host:port` entries
- [ ] Test proxy rotation — confirm each job gets a different IP
- [ ] Validate `HumanSimulatorService`:
  - Random delay between page actions (2–8 seconds)
  - Gradual scroll simulation
  - Bezier-curve mouse movement to elements
- [ ] Integrate `CaptchaService` — configure `CAPTCHA_API_KEY` + `CAPTCHA_PROVIDER`
- [ ] Test full anti-detection stack against LinkedIn (guest pages first)
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
- [ ] Build `LinkedInCompanyParser` for company overview pages
- [ ] Handle parse errors gracefully — store `parseError: true` in DB instead of crashing
- [ ] Add selector versioning — LinkedIn changes selectors frequently
- [ ] Write unit tests for each parser with fixture HTML files

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

## Phase 5 — Hardening & Observability

**Goal**: Production-ready reliability, monitoring, and cost control.

### Reliability
- [ ] Circuit breaker — stop retrying after 5 consecutive failures on same domain
- [ ] Dead letter queue — capture permanently failed jobs for manual review
- [ ] Graceful shutdown — drain in-flight jobs before process exit
- [ ] Stale session cleanup — `SessionManagerService.purgeExpired()` on cron

### Observability
- [ ] Prometheus metrics endpoint (`/metrics`) via `nestjs-prometheus`
  - `scraper_jobs_total` (counter, by target + status)
  - `scraper_block_rate` (gauge)
  - `scraper_job_duration_seconds` (histogram)
  - `browser_pool_size` (gauge)
- [ ] Grafana dashboard — import from `infra/grafana/dashboards/`
- [ ] Alert rules:
  - Block rate > 10% → Slack/email notification
  - Queue depth > 500 → scale warning
  - DB connection pool exhausted → critical alert

### Scaling
- [ ] Horizontal worker scaling — run multiple `OrchestratorProcessor` instances
  ```bash
  docker compose up --scale app=3
  ```
- [ ] Worker concurrency tuning via `SCRAPER_CONCURRENCY` env var
- [ ] Redis cluster mode for high availability

### Cost Controls
- [ ] Cache scraped URLs in Redis (TTL: 24h) — skip re-scraping same URL
- [ ] Proxy bandwidth monitoring — alert at 80% monthly quota
- [ ] CAPTCHA solve budget limit per job

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
