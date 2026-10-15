# Graph Report - nestjs-scraper  (2026-10-15)

## Corpus Check
- 99 files · ~69,158 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 780 nodes · 1335 edges · 53 communities (35 shown, 18 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.85)
- Token cost: 89,871 input · 0 output

## Community Hubs (Navigation)
- Anti-Detection & SSRF Guard
- TypeORM Entity
- Lint & Jest Config
- Resilience & Proxy Concepts
- Pixelscan Fetch Diagnostics
- Orchestrator, Worker & CAPTCHA
- Project Phases & Legal
- Fixture Capture Script
- Pixelscan Canvas Diagnostics
- TypeScript Config
- Runtime Dependencies
- Profile Parser & Block Detection
- Dev Dependencies
- npm Scripts
- Jobs Controller
- Stealth Smoke Test
- Scraper Module Wiring
- Request DTOs & URL Validation
- Browser Factory & Human Sim Deps
- Jobs & Company Parsers
- Fingerprint Service
- Human Behaviour Simulator
- Prometheus Metrics
- Jobs Service
- Session Manager
- App Bootstrap
- Targets & Normalizer
- Health Controller
- Cache & Circuit Breaker Modules
- Metrics Controller
- Validation Decorators
- Docker Compose Stack
- Redis URL Cache
- Prometheus Alerts & Scaling
- Pagination DTO
- Nest CLI Config
- Data Normalizer
- Pixelscan Header Diag
- API Module Wiring
- Job Status Enum
- LinkedIn Cookie Session
- CAPTCHA Types
- Pixelscan Mock Diag
- Pixelscan JS Search
- PS Header Diag
- Stealth Validation Findings
- Pixelscan JS Hunt
- Pixelscan Trace

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 42 edges
2. `OrchestratorService` - 24 edges
3. `ScrapeResult` - 23 edges
4. `playwright-extra` - 23 edges
5. `puppeteer-extra-plugin-stealth` - 23 edges
6. `scripts` - 21 edges
7. `compilerOptions` - 19 edges
8. `playwright` - 18 edges
9. `CreateJobDto` - 17 edges
10. `MetricsService` - 16 edges

## Surprising Connections (you probably didn't know these)
- `ScraperJobsFailing alert` --shares_data_with--> `MetricsService`  [INFERRED]
  infra/prometheus/alerts.yml → src/monitoring/metrics.service.ts
- `ScraperHighBlockRate alert` --shares_data_with--> `MetricsService`  [INFERRED]
  infra/prometheus/alerts.yml → src/monitoring/metrics.service.ts
- `ScraperQueueBacklog alert` --shares_data_with--> `MetricsService`  [INFERRED]
  infra/prometheus/alerts.yml → src/monitoring/metrics.service.ts
- `Monitoring (Terminus health + Prometheus /metrics)` --references--> `MetricsService`  [INFERRED]
  README.md → src/monitoring/metrics.service.ts
- `ProxyRotatorService` --references--> `Residential proxy providers (Bright Data / Oxylabs / Smartproxy)`  [INFERRED]
  src/scraper/proxy/proxy-rotator.service.ts → IMPLEMENTATION_PHASES.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Orchestrator anti-detection scrape flow** — src_scraper_orchestrator_orchestrator_service_orchestratorservice, src_scraper_anti_detection_human_simulator_human_simulator_service_humansimulatorservice, src_scraper_anti_detection_captcha_captcha_service_captchaservice, src_scraper_proxy_proxy_rotator_service_proxyrotatorservice, implementation_phases_block_detection, implementation_phases_retry_loop [INFERRED 0.85]
- **Prometheus/Grafana observability stack** — src_monitoring_metrics_service_metricsservice, infra_prometheus_prometheus_nestjs_scraper_job, infra_prometheus_alerts_scraper_group, docker_compose_prometheus, docker_compose_grafana, infra_grafana_provisioning_datasources_prometheus_datasource [INFERRED 0.95]
- **LinkedIn parser fixture-based unit tests** — src_pipeline_parsers___fixtures___company_fixture, src_pipeline_parsers___fixtures___jobs_fixture, src_pipeline_parsers___fixtures___profile_fixture, src_pipeline_parsers___fixtures___profile_synthetic_fixture, src_pipeline_parsers_linkedin_profile_parser_linkedinprofileparser, src_pipeline_parsers_linkedin_jobs_parser_linkedinjobsparser, src_pipeline_parsers_linkedin_company_parser_linkedincompanyparser [INFERRED 0.95]
- **Anti-Detection Stack** — readme_playwright_extra_stealth, readme_fingerprint_service, readme_human_simulator_service, readme_proxy_rotation, readme_captcha_service [EXTRACTED 1.00]
- **SSRF Defense in Depth (submit-time URL policy + runtime navigation guard)** — readme_ssrf_protection, readme_runtime_navigation_guard, src_scraper_security_url_policy_isallowedtargeturl, src_scraper_security_url_policy_isinternalurl, src_scraper_security_navigation_guard_installnavigationguard, src_scraper_security_navigation_guard_navigationblockederror [INFERRED 0.85]
- **Job Lifecycle (submit, queue, scrape, parse, persist, retrieve)** — readme_jobs_endpoint, readme_bullmq, readme_orchestrator, readme_browser_pool, readme_pipeline, readme_scrape_result_entity, readme_results_endpoint [INFERRED 0.85]

## Communities (53 total, 18 thin omitted)

### Community 0 - "Anti-Detection & SSRF Guard"
Cohesion: 0.06
Nodes (40): Akamai Bot Manager, DataDome, Phase 2 - Browser Layer, Phase 3 - Anti-Detection Hardening, Phase 3 smoke test (npm run smoke:phase3), BrowserPoolService (Playwright context pool), CaptchaService (2captcha), Environment Variables (.env.example) (+32 more)

### Community 1 - "TypeORM Entity"
Cohesion: 0.08
Nodes (9): @nestjs/typeorm, typeorm, ResultsController, ResultsModule, ResultsService, ScrapeResult, StorageModule, SaveResultInput (+1 more)

### Community 2 - "Lint & Jest Config"
Cohesion: 0.05
Nodes (43): author, description, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment (+35 more)

### Community 3 - "Resilience & Proxy Concepts"
Cohesion: 0.06
Nodes (7): Residential proxy providers (Bright Data / Oxylabs / Smartproxy), ScraperHighBlockRate alert, BrowserFactoryService, BrowserPoolService, CircuitBreakerService, parseProxyEntry(), ProxyRotatorService

### Community 4 - "Pixelscan Fetch Diagnostics"
Cohesion: 0.09
Nodes (15): stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin (+7 more)

### Community 5 - "Orchestrator, Worker & CAPTCHA"
Cohesion: 0.10
Nodes (4): 2captcha API, CaptchaService, OrchestratorProcessor, OrchestratorService

### Community 6 - "Project Phases & Legal"
Cohesion: 0.09
Nodes (23): Implementation Phases (NestJS Scraper), Legal notice (LinkedIn ToS, GDPR, CFAA), Phase 1 - Foundation, Phase 4 - LinkedIn Parsers, Phase 5 - Hardening & Observability, Selector versioning (planned), REST API (Jobs + Results), BullMQ Job Queue (+15 more)

### Community 7 - "Fixture Capture Script"
Cohesion: 0.10
Nodes (28): capture(), FIXTURES_DIR, launchContext(), main(), ParsedProxy, parseProxy(), stealth, StealthPlugin (+20 more)

### Community 8 - "Pixelscan Canvas Diagnostics"
Cohesion: 0.09
Nodes (14): playwright-extra, puppeteer-extra-plugin-stealth, stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin (+6 more)

### Community 9 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+16 more)

### Community 10 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, axios, bullmq, cheerio, class-transformer, class-validator, ioredis, @nestjs/bullmq (+16 more)

### Community 11 - "Profile Parser & Block Detection"
Cohesion: 0.13
Nodes (10): profile.html fixture (LinkedIn guest profile / authwall), profile-synthetic.html fixture (synthetic logged-in profile), CheerioEl, CheerioRoot, EducationEntry, ExperienceEntry, LinkedInProfile, LinkedInProfileParser (+2 more)

### Community 12 - "Dev Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, eslint, eslint-config-prettier, eslint-plugin-prettier, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing (+14 more)

### Community 13 - "npm Scripts"
Cohesion: 0.10
Nodes (21): scripts, build, capture:fixtures, capture:fixtures:headful, format, lint, lint:fix, smoke:phase3 (+13 more)

### Community 15 - "Stealth Smoke Test"
Cohesion: 0.26
Nodes (15): CheckResult, fail(), main(), pass(), patchHeadlessSignals(), patchUserAgentData(), patchWebGLConsistency(), printReport() (+7 more)

### Community 16 - "Scraper Module Wiring"
Cohesion: 0.27
Nodes (5): AntiDetectionModule, BrowserModule, OrchestratorModule, ProxyModule, SessionModule

### Community 17 - "Request DTOs & URL Validation"
Cohesion: 0.22
Nodes (8): class-transformer, class-validator, @nestjs/swagger, MAX_PAGE_SIZE, IsAllowedTargetUrl(), JOB_PRIORITIES, JobPriority, PRIORITY_MAP

### Community 18 - "Browser Factory & Human Sim Deps"
Cohesion: 0.20
Nodes (8): @nestjs/config, playwright, Point, stealth, StealthPlugin, PoolEntry, ProxyConfig, ProxyEntry

### Community 19 - "Jobs & Company Parsers"
Cohesion: 0.16
Nodes (8): cheerio, jobs.html fixture (LinkedIn jobs search), CheerioRoot, LinkedInCompany, LinkedInJob, LinkedInJobsPage, LinkedInJobsParser, PipelineModule

### Community 20 - "Fingerprint Service"
Cohesion: 0.16
Nodes (7): BrowserProfile, FingerprintService, LOCALES, PLATFORMS, TIMEZONES, USER_AGENTS, VIEWPORTS

### Community 22 - "Prometheus Metrics"
Cohesion: 0.20
Nodes (4): Prometheus scraper metrics (scraper_jobs_total, scraper_block_rate, scraper_job_duration_seconds, browser_pool_size), bullmq, prom-client, MetricsService

### Community 25 - "App Bootstrap"
Cohesion: 0.24
Nodes (4): @nestjs/bullmq, AppModule, QueueModule, ScraperModule

### Community 26 - "Targets & Normalizer"
Cohesion: 0.27
Nodes (7): ScraperTarget, LINKEDIN_COMPANY, LINKEDIN_JOBS, LINKEDIN_PROFILE, ScrapeJobData, BLOCK_TITLE_PATTERNS, BLOCK_URL_PATTERNS

### Community 27 - "Health Controller"
Cohesion: 0.24
Nodes (3): @nestjs/terminus, HealthController, MonitoringModule

### Community 28 - "Cache & Circuit Breaker Modules"
Cohesion: 0.24
Nodes (4): @nestjs/common, CacheModule, CircuitBreakerModule, DomainState

### Community 31 - "Docker Compose Stack"
Cohesion: 0.36
Nodes (8): app service, grafana service (monitoring profile), postgres service (16-alpine), prometheus service (monitoring profile), redis service (7-alpine, optional requirepass), docker-compose stack, Grafana dashboard provider 'scraper', Grafana Prometheus datasource

### Community 33 - "Prometheus Alerts & Scaling"
Cohesion: 0.33
Nodes (7): Horizontal worker scaling (--scale app=N), Prometheus alert group 'scraper', ScraperDown alert, ScraperJobsFailing alert, ScraperQueueBacklog alert, Prometheus scrape config, Prometheus job 'nestjs-scraper' (app:3000/metrics)

### Community 35 - "Nest CLI Config"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 37 - "Pixelscan Header Diag"
Cohesion: 0.40
Nodes (5): main(), patchAll(), SMOKE_SEC_CH_UA_HEADERS, stealth, StealthPlugin

### Community 39 - "Job Status Enum"
Cohesion: 0.33
Nodes (6): JobStatus, ACTIVE, COMPLETED, DELAYED, FAILED, PENDING

### Community 42 - "CAPTCHA Types"
Cohesion: 0.40
Nodes (4): axios, CaptchaResult, CaptchaType, DetectedCaptcha

### Community 43 - "Pixelscan Mock Diag"
Cohesion: 0.50
Nodes (4): main(), runTest(), stealth, StealthPlugin

### Community 44 - "Pixelscan JS Search"
Cohesion: 0.40
Nodes (3): stealth, StealthPlugin, TARGET_JS

### Community 45 - "PS Header Diag"
Cohesion: 0.40
Nodes (3): SMOKE_SEC_CH_UA_HEADERS, stealth, StealthPlugin

### Community 46 - "Stealth Validation Findings"
Cohesion: 0.50
Nodes (3): bot.sannysoft.com smoke check, pixelscan checkFingerprintMasking, Stealth smoke test (npm run smoke:stealth)

## Ambiguous Edges - Review These
- `profile.html fixture (LinkedIn guest profile / authwall)` → `Block detection (checkpoint/authwall/login, 403/429)`  [AMBIGUOUS]
  src/pipeline/parsers/__fixtures__/profile.html · relation: conceptually_related_to

## Knowledge Gaps
- **245 isolated node(s):** `CaptchaResult`, `CaptchaType`, `DetectedCaptcha`, `Point`, `PoolEntry` (+240 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 409 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `profile.html fixture (LinkedIn guest profile / authwall)` and `Block detection (checkpoint/authwall/login, 403/429)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `@nestjs/common` connect `Cache & Circuit Breaker Modules` to `TypeORM Entity`, `Lint & Jest Config`, `API Module Wiring`, `CAPTCHA Types`, `Profile Parser & Block Detection`, `Scraper Module Wiring`, `Request DTOs & URL Validation`, `Browser Factory & Human Sim Deps`, `Jobs & Company Parsers`, `Fingerprint Service`, `Prometheus Metrics`, `Session Manager`, `App Bootstrap`, `Targets & Normalizer`, `Health Controller`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `playwright` connect `Browser Factory & Human Sim Deps` to `Anti-Detection & SSRF Guard`, `Lint & Jest Config`, `Pixelscan Header Diag`, `Fixture Capture Script`, `Pixelscan Canvas Diagnostics`, `CAPTCHA Types`, `Pixelscan Mock Diag`, `Pixelscan JS Hunt`, `Stealth Smoke Test`, `Targets & Normalizer`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `playwright-extra` connect `Pixelscan Canvas Diagnostics` to `Lint & Jest Config`, `Pixelscan Fetch Diagnostics`, `Pixelscan Header Diag`, `Fixture Capture Script`, `Pixelscan Mock Diag`, `Pixelscan JS Search`, `PS Header Diag`, `Pixelscan JS Hunt`, `Pixelscan Trace`, `Stealth Smoke Test`, `Browser Factory & Human Sim Deps`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `OrchestratorService` (e.g. with `Orchestrator (BullMQ processor + job runner)` and `CaptchaService`) actually correct?**
  _`OrchestratorService` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CaptchaResult`, `CaptchaType`, `DetectedCaptcha` to the rest of the system?**
  _245 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Anti-Detection & SSRF Guard` be split into smaller, more focused modules?**
  _Cohesion score 0.05649717514124294 - nodes in this community are weakly interconnected._