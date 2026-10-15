# Graph Report - nestjs-scraper  (2026-10-15)

## Corpus Check
- 95 files · ~67,341 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .example 1)

## Summary
- 713 nodes · 1253 edges · 39 communities (27 shown, 12 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.83)
- Token cost: 104,789 input · 0 output

## Community Hubs (Navigation)
- App Bootstrap & Wiring
- TypeORM Entity & Validators
- Lint & Jest Config
- Pixelscan Canvas Diagnostics
- Project Phases & Docs
- Pixelscan Masking Diagnostics
- Docker Compose & Scaling
- Health & Metrics Endpoints
- TypeScript Config
- Runtime Dependencies
- Fingerprint & Stealth Browser
- Dev Dependencies
- npm Scripts
- Profile Parser & Block Detection
- Metrics & Resilience Concepts
- Phase 3 Smoke Test
- Jobs Controller
- Stealth Smoke Test
- Job Response DTOs
- Request DTOs & Pagination
- Orchestrator Scrape Flow
- URL Cache & Circuit Breaker
- Jobs Service
- Human Behaviour Simulator
- Fixture Capture Script
- CAPTCHA Solving
- Job Input Validation (SSRF)
- Browser Context Pool
- Proxy Rotation
- BullMQ Worker Processor
- API Module Wiring
- Nest CLI Config
- Data Normalizer
- Pixelscan Header Diag
- Pixelscan Mock Diag
- Pixelscan JS Search
- Stealth Validation Findings
- Pixelscan JS Fetcher
- Result Storage

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 42 edges
2. `playwright-extra` - 23 edges
3. `puppeteer-extra-plugin-stealth` - 23 edges
4. `ScrapeResult` - 23 edges
5. `OrchestratorService` - 23 edges
6. `scripts` - 21 edges
7. `compilerOptions` - 19 edges
8. `MetricsService` - 17 edges
9. `ProxyRotatorService` - 17 edges
10. `playwright` - 16 edges

## Surprising Connections (you probably didn't know these)
- `https LinkedIn-only job URL restriction (SSRF prevention)` --rationale_for--> `CreateJobDto`  [AMBIGUOUS]
  README.md → src/api/jobs/dto/create-job.dto.ts
- `ScraperJobsFailing alert` --shares_data_with--> `MetricsService`  [INFERRED]
  infra/prometheus/alerts.yml → src/monitoring/metrics.service.ts
- `Prometheus job 'nestjs-scraper' (app:3000/metrics)` --references--> `MetricsController`  [INFERRED]
  infra/prometheus/prometheus.yml → src/monitoring/metrics.controller.ts
- `ScraperQueueBacklog alert` --shares_data_with--> `MetricsService`  [INFERRED]
  infra/prometheus/alerts.yml → src/monitoring/metrics.service.ts
- `Redis URL cache (TTL 24h)` --rationale_for--> `UrlCacheService`  [EXTRACTED]
  IMPLEMENTATION_PHASES.md → src/scraper/cache/url-cache.service.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Orchestrator anti-detection scrape flow** — src_scraper_orchestrator_orchestrator_service_orchestratorservice, src_scraper_anti_detection_human_simulator_human_simulator_service_humansimulatorservice, src_scraper_anti_detection_captcha_captcha_service_captchaservice, src_scraper_proxy_proxy_rotator_service_proxyrotatorservice, implementation_phases_block_detection, implementation_phases_retry_loop [INFERRED 0.85]
- **Prometheus/Grafana observability stack** — src_monitoring_metrics_service_metricsservice, infra_prometheus_prometheus_nestjs_scraper_job, infra_prometheus_alerts_scraper_group, docker_compose_prometheus, docker_compose_grafana, infra_grafana_provisioning_datasources_prometheus_datasource [INFERRED 0.95]
- **LinkedIn parser fixture-based unit tests** — src_pipeline_parsers___fixtures___company_fixture, src_pipeline_parsers___fixtures___jobs_fixture, src_pipeline_parsers___fixtures___profile_fixture, src_pipeline_parsers___fixtures___profile_synthetic_fixture, src_pipeline_parsers_linkedin_profile_parser_linkedinprofileparser, src_pipeline_parsers_linkedin_jobs_parser_linkedinjobsparser, src_pipeline_parsers_linkedin_company_parser_linkedincompanyparser [INFERRED 0.95]

## Communities (39 total, 12 thin omitted)

### Community 0 - "App Bootstrap & Wiring"
Cohesion: 0.06
Nodes (29): axios, @nestjs/bullmq, @nestjs/common, @nestjs/config, playwright, AppModule, PipelineModule, QueueModule (+21 more)

### Community 1 - "TypeORM Entity & Validators"
Cohesion: 0.08
Nodes (8): @nestjs/typeorm, typeorm, PaginationQueryDto, ResultsController, ResultsService, ScrapeResult, StorageModule, SaveResultInput

### Community 2 - "Lint & Jest Config"
Cohesion: 0.05
Nodes (43): author, description, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment (+35 more)

### Community 3 - "Pixelscan Canvas Diagnostics"
Cohesion: 0.07
Nodes (18): playwright-extra, puppeteer-extra-plugin-stealth, stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin (+10 more)

### Community 4 - "Project Phases & Docs"
Cohesion: 0.08
Nodes (22): Akamai Bot Manager, DataDome, Implementation Phases (NestJS Scraper), Legal notice (LinkedIn ToS, GDPR, CFAA), Phase 1 - Foundation, Phase 3 - Anti-Detection Hardening, Phase 3 smoke test (npm run smoke:phase3), Phase 4 - LinkedIn Parsers (+14 more)

### Community 5 - "Pixelscan Masking Diagnostics"
Cohesion: 0.09
Nodes (15): stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin (+7 more)

### Community 6 - "Docker Compose & Scaling"
Cohesion: 0.09
Nodes (18): app service, grafana service (monitoring profile), postgres service (16-alpine), prometheus service (monitoring profile), redis service (7-alpine, optional requirepass), docker-compose stack, Horizontal worker scaling (--scale app=N), Phase 5 - Hardening & Observability (+10 more)

### Community 7 - "Health & Metrics Endpoints"
Cohesion: 0.09
Nodes (4): @nestjs/terminus, HealthController, MetricsController, MonitoringModule

### Community 8 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+16 more)

### Community 9 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, axios, bullmq, cheerio, class-transformer, class-validator, ioredis, @nestjs/bullmq (+16 more)

### Community 10 - "Fingerprint & Stealth Browser"
Cohesion: 0.11
Nodes (9): Phase 2 - Browser Layer, BrowserProfile, FingerprintService, LOCALES, PLATFORMS, TIMEZONES, USER_AGENTS, VIEWPORTS (+1 more)

### Community 11 - "Dev Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, eslint, eslint-config-prettier, eslint-plugin-prettier, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing (+14 more)

### Community 12 - "npm Scripts"
Cohesion: 0.10
Nodes (21): scripts, build, capture:fixtures, capture:fixtures:headful, format, lint, lint:fix, smoke:phase3 (+13 more)

### Community 13 - "Profile Parser & Block Detection"
Cohesion: 0.14
Nodes (9): profile.html fixture (LinkedIn guest profile / authwall), profile-synthetic.html fixture (synthetic logged-in profile), CheerioEl, CheerioRoot, EducationEntry, ExperienceEntry, LinkedInProfile, LinkedInProfileParser (+1 more)

### Community 14 - "Metrics & Resilience Concepts"
Cohesion: 0.14
Nodes (8): Prometheus scraper metrics (scraper_jobs_total, scraper_block_rate, scraper_job_duration_seconds, browser_pool_size), ScraperHighBlockRate alert, prom-client, MetricsService, CircuitBreakerService, DomainState, job, setup()

### Community 15 - "Phase 3 Smoke Test"
Cohesion: 0.17
Nodes (19): BLOCK_TITLE_PATTERNS, BLOCK_URL_PATTERNS, CAPTCHA_SELECTORS, checkLinkedInPage(), checkProxyRotation(), CheckResult, fail(), getMyIp() (+11 more)

### Community 17 - "Stealth Smoke Test"
Cohesion: 0.26
Nodes (15): CheckResult, fail(), main(), pass(), patchHeadlessSignals(), patchUserAgentData(), patchWebGLConsistency(), printReport() (+7 more)

### Community 18 - "Job Response DTOs"
Cohesion: 0.17
Nodes (10): bullmq, @nestjs/swagger, JobPriority, JobStatus, ACTIVE, COMPLETED, DELAYED, FAILED (+2 more)

### Community 19 - "Request DTOs & Pagination"
Cohesion: 0.18
Nodes (9): class-transformer, class-validator, MAX_PAGE_SIZE, ALLOWED_HOSTS, JOB_PRIORITIES, ScraperTarget, LINKEDIN_COMPANY, LINKEDIN_JOBS (+1 more)

### Community 24 - "Fixture Capture Script"
Cohesion: 0.24
Nodes (9): capture(), FIXTURES_DIR, launchContext(), main(), ParsedProxy, parseProxy(), stealth, StealthPlugin (+1 more)

### Community 28 - "Proxy Rotation"
Cohesion: 0.22
Nodes (3): Residential proxy providers (Bright Data / Oxylabs / Smartproxy), parseProxyEntry(), ProxyRotatorService

### Community 30 - "API Module Wiring"
Cohesion: 0.29
Nodes (3): ApiModule, JobsModule, ResultsModule

### Community 31 - "Nest CLI Config"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 33 - "Pixelscan Header Diag"
Cohesion: 0.40
Nodes (5): main(), patchAll(), SMOKE_SEC_CH_UA_HEADERS, stealth, StealthPlugin

### Community 34 - "Pixelscan Mock Diag"
Cohesion: 0.50
Nodes (4): main(), runTest(), stealth, StealthPlugin

### Community 35 - "Pixelscan JS Search"
Cohesion: 0.40
Nodes (3): stealth, StealthPlugin, TARGET_JS

### Community 36 - "Stealth Validation Findings"
Cohesion: 0.50
Nodes (3): bot.sannysoft.com smoke check, pixelscan checkFingerprintMasking, Stealth smoke test (npm run smoke:stealth)

## Ambiguous Edges - Review These
- `CreateJobDto` → `https LinkedIn-only job URL restriction (SSRF prevention)`  [AMBIGUOUS]
  README.md · relation: rationale_for
- `Block detection (checkpoint/authwall/login, 403/429)` → `profile.html fixture (LinkedIn guest profile / authwall)`  [AMBIGUOUS]
  src/pipeline/parsers/__fixtures__/profile.html · relation: conceptually_related_to

## Knowledge Gaps
- **241 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `plugins` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 376 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CreateJobDto` and `https LinkedIn-only job URL restriction (SSRF prevention)`?**
  _Edge tagged AMBIGUOUS (relation: rationale_for) - confidence is low._
- **What is the exact relationship between `Block detection (checkpoint/authwall/login, 403/429)` and `profile.html fixture (LinkedIn guest profile / authwall)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `@nestjs/common` connect `App Bootstrap & Wiring` to `TypeORM Entity & Validators`, `Lint & Jest Config`, `Project Phases & Docs`, `Docker Compose & Scaling`, `Health & Metrics Endpoints`, `Fingerprint & Stealth Browser`, `Profile Parser & Block Detection`, `Metrics & Resilience Concepts`, `Job Response DTOs`, `Request DTOs & Pagination`, `API Module Wiring`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `playwright` connect `App Bootstrap & Wiring` to `Pixelscan Header Diag`, `Lint & Jest Config`, `Pixelscan Canvas Diagnostics`, `Pixelscan Mock Diag`, `Phase 3 Smoke Test`, `Stealth Smoke Test`, `Fixture Capture Script`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `playwright-extra` connect `Pixelscan Canvas Diagnostics` to `App Bootstrap & Wiring`, `Pixelscan Header Diag`, `Lint & Jest Config`, `Pixelscan Mock Diag`, `Pixelscan JS Search`, `Pixelscan JS Fetcher`, `Pixelscan Masking Diagnostics`, `Phase 3 Smoke Test`, `Stealth Smoke Test`, `Fixture Capture Script`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _241 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Bootstrap & Wiring` be split into smaller, more focused modules?**
  _Cohesion score 0.06223358908780904 - nodes in this community are weakly interconnected._