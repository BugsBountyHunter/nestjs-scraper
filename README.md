# nestjs-scraper

> **Legal Notice**: LinkedIn's Terms of Service prohibit unauthorized scraping.
> This project must only be used for authorized data collection, your own account data, or research.
> Always comply with applicable laws (GDPR, CFAA) and the target site's `robots.txt`.

A production-ready NestJS web scraper with anti-detection architecture. Built on Playwright-extra with stealth plugins, BullMQ job queues, residential proxy rotation, and PostgreSQL persistence.

---

## Architecture

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
└── IMPLEMENTATION_PHASES.md    # Detailed phase-by-phase implementation log
```

---

## Tech Stack

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

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Playwright Chromium: `npx playwright install chromium`

### Setup

```bash
# Clone the repo
git clone https://github.com/BugsBountyHunter/nestjs-scraper.git
cd nestjs-scraper

# Copy environment file and fill in your values
cp .env.example .env

# Start PostgreSQL + Redis
docker compose up -d postgres redis

# Install dependencies
npm install

# Start dev server
npm run start:dev
```

- Swagger UI: http://localhost:3000/api/docs
- Health check: http://localhost:3000/health

---

## API Reference

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

### Submit a scraping job

```bash
curl -X POST http://localhost:3000/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "target": "linkedin_profile",
    "url": "https://www.linkedin.com/in/username/",
    "priority": "high"
  }'
```

### Check job status

```bash
curl http://localhost:3000/jobs/{jobId}
```

### Retrieve results

```bash
curl http://localhost:3000/results/job/{jobId}
```

---

## Implementation Progress

### Phase 1 — Foundation ✅

NestJS project scaffold with database, queue, and API skeleton.

- TypeORM + PostgreSQL (`ScrapeResult` entity)
- BullMQ queue wiring
- REST API: Jobs + Results modules
- Health endpoint via `@nestjs/terminus`
- Swagger UI via `@nestjs/swagger`
- Docker Compose: PostgreSQL 16 + Redis 7

### Phase 2 — Browser Layer ✅

Playwright-extra + stealth setup with browser pool (10/12 checks pass).

- `BrowserPoolService` — acquire / release / destroy with 20-cycle reuse
- `FingerprintService` — randomized user agents, Client Hints, `sec-ch-ua` headers
- `HumanSimulatorService` — random delays, scroll simulation, Bezier mouse movement
- Smoke test: `npm run smoke:stealth` (headless) or `npm run smoke:stealth:headful`

**Smoke test results:**
- bot.sannysoft.com: 7/7 ✅ (webdriver, chrome-obj, permissions, plugins, languages)
- pixelscan.net bot-check: PASS — "No automated behavior detected"
- pixelscan.net canvas masking: detected (Phase 3 concern)

### Phase 3 — Anti-Detection Hardening _(in progress)_

Bypass Akamai Bot Manager and DataDome detection layers.

- Residential proxy rotation (`PROXY_POOL` env var)
- CAPTCHA solver integration (`CaptchaService`)
- Target: < 5% block rate per session

### Phase 4 — LinkedIn Parsers _(planned)_

Structured data extraction for LinkedIn profiles, jobs, and company pages.

| Target | Endpoint | Parser |
|--------|---------|--------|
| `linkedin_profile` | `/in/username` | `LinkedInProfileParser` |
| `linkedin_jobs` | `/jobs/search` | `LinkedInJobsParser` |
| `linkedin_company` | `/company/name` | `LinkedInCompanyParser` |

### Phase 5 — Hardening & Observability _(planned)_

Production-ready reliability and monitoring.

- Prometheus metrics (`/metrics`) — job counters, block rate, duration histograms
- Grafana dashboard
- Circuit breaker + dead letter queue
- Horizontal worker scaling via `docker compose up --scale app=3`
- Redis URL caching (TTL: 24h) for cost control

---

## Smoke Tests

```bash
# Headless (CI-friendly)
npm run smoke:stealth

# Headful — watch the browser
npm run smoke:stealth:headful

# Offline only (no network required)
SKIP_NETWORK=true npm run smoke:stealth
```

---

## Environment Variables

See [.env.example](.env.example) for the full list. Key variables:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/scraper
REDIS_URL=redis://localhost:6379
PROXY_POOL=user1:pass1@gate.provider.com:7000,user2:pass2@gate.provider.com:7001
CAPTCHA_API_KEY=your_2captcha_key
SCRAPER_CONCURRENCY=3
SCRAPER_MIN_DELAY_MS=3000
SCRAPER_MAX_DELAY_MS=10000
```

---

## License

UNLICENSED — private use only.
