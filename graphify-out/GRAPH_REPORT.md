# Graph Report - nestjs-scraper  (2026-10-15)

## Corpus Check
- 107 files · ~72,579 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .example 1)

## Summary
- 800 nodes · 1453 edges · 45 communities (29 shown, 16 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.83)
- Token cost: 96,754 input · 0 output

## Community Hubs (Navigation)
- App Bootstrap & Core Deps
- TypeORM Entity & Storage
- Phase 3 Smoke Test
- Targets & Normalizer
- Orchestrator
- Stealth Smoke Test
- Parse Errors & Partial Results
- Request DTO Deps
- SSRF Defence
- Circuit Breaker & Metrics Calls
- Company Parser
- Jobs Service
- Jobs Controller
- Session Manager
- Fixture Capture Script
- Job Input Validation
- Profile Parser
- Human Behaviour Simulator
- BullMQ Worker
- Health, Metrics & Alerts
- CAPTCHA Solving
- Browser Context Pool
- Proxy Rotation
- Pagination DTO
- API Module Wiring
- Job Status Enum
- Fingerprint & Browser Context
- Pixelscan Header Diag
- Pixelscan Mock Diag
- Pixelscan JS Search
- Pixelscan JS Fetcher
- Pixelscan Stealth Diagnostics
- Pixelscan Persistent Diagnostics
- Runtime Dependencies
- Dev Dependencies
- npm Scripts
- Coverage Gate Thresholds
- Nest CLI Config
- Lint & Package Config
- Docker Compose Stack
- TypeScript Config
- Phases 2-3 Anti-Detection
- Phase 5 Reliability
- Grafana Provisioning

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 42 edges
2. `ScrapeResult` - 26 edges
3. `playwright-extra` - 24 edges
4. `puppeteer-extra-plugin-stealth` - 23 edges
5. `scripts` - 21 edges
6. `OrchestratorService` - 19 edges
7. `compilerOptions` - 19 edges
8. `playwright` - 18 edges
9. `MetricsService` - 18 edges
10. `BrowserFactoryService` - 17 edges

## Surprising Connections (you probably didn't know these)
- `API Reference (/jobs, /results, /health, /metrics)` --references--> `MetricsController`  [INFERRED]
  README.md → src/monitoring/metrics.controller.ts
- `Phase 1 — Foundation` --references--> `CreateScrapeResults1760500000000`  [AMBIGUOUS]
  IMPLEMENTATION_PHASES.md → src/pipeline/storage/migrations/1760500000000-CreateScrapeResults.ts
- `Job URL Validation (https LinkedIn, default port)` --references--> `CreateJobDto`  [INFERRED]
  README.md → src/api/jobs/dto/create-job.dto.ts
- `Compose Service: prometheus (monitoring profile)` --references--> `MetricsController`  [INFERRED]
  docker-compose.yml → src/monitoring/metrics.controller.ts
- `Partial Result Flagging` --references--> `MetricsService`  [INFERRED]
  IMPLEMENTATION_PHASES.md → src/monitoring/metrics.service.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **SSRF Defense in Depth Layers** — readme_job_url_validation, readme_in_app_navigation_guard, readme_network_isolation, docker_compose_browser, infra_browser_entrypoint, github_workflows_ci_browser_isolation_job, src_scraper_security_navigation_guard_installnavigationguard, src_scraper_security_url_policy_isallowedtargeturl [EXTRACTED 1.00]
- **Partial Result Flagging Flow** — implementation_phases_partial_result_flagging, src_pipeline_normalizers_result_completeness_assesscompleteness, src_scraper_orchestrator_orchestrator_service_orchestratorservice, src_pipeline_storage_scrape_result_entity_scraperesult, src_monitoring_metrics_service_metricsservice, src_scraper_cache_url_cache_service_urlcacheservice [INFERRED 0.85]
- **Observability Stack** — docker_compose_prometheus, docker_compose_grafana, src_monitoring_metrics_controller_metricscontroller, src_monitoring_metrics_service_metricsservice, implementation_phases_prometheus_metrics [INFERRED 0.85]

## Communities (45 total, 16 thin omitted)

### Community 0 - "App Bootstrap & Core Deps"
Cohesion: 0.05
Nodes (36): AppModule, LinkedInJob, LinkedInJobsPage, CheerioEl, CheerioRoot, EducationEntry, ExperienceEntry, LinkedInProfile (+28 more)

### Community 1 - "TypeORM Entity & Storage"
Cohesion: 0.07
Nodes (10): ResultsController, ResultsModule, ResultsService, CreateScrapeResults1760500000000, ScrapeResult, StorageModule, SaveResultInput, StorageService (+2 more)

### Community 14 - "Phase 3 Smoke Test"
Cohesion: 0.17
Nodes (19): CheckResult, ParsedProxy, SiteReport, checkLinkedInPage(), checkProxyRotation(), fail(), getMyIp(), hasCaptcha() (+11 more)

### Community 15 - "Targets & Normalizer"
Cohesion: 0.16
Nodes (8): ScraperTarget, DataNormalizerService, ResultCompleteness, assessCompleteness(), LINKEDIN_COMPANY, LINKEDIN_JOBS, LINKEDIN_PROFILE, RULES

### Community 16 - "Orchestrator"
Cohesion: 0.16
Nodes (6): ScrapeJobData, OrchestratorService, setup(), job, mockedInstallGuard, passGuard

### Community 17 - "Stealth Smoke Test"
Cohesion: 0.26
Nodes (15): CheckResult, SiteReport, fail(), main(), pass(), patchHeadlessSignals(), patchUserAgentData(), patchWebGLConsistency() (+7 more)

### Community 18 - "Parse Errors & Partial Results"
Cohesion: 0.15
Nodes (5): LinkedInJobsParser, UrlCacheService, Phase 4 — LinkedIn Parsers, Selector Versioning (pending), jobs.html fixture (LinkedIn jobs search)

### Community 19 - "Request DTO Deps"
Cohesion: 0.24
Nodes (7): JobPriority, MAX_PAGE_SIZE, JOB_PRIORITIES, PRIORITY_MAP, class-transformer, class-validator, @nestjs/swagger

### Community 2 - "SSRF Defence"
Cohesion: 0.09
Nodes (27): ContextGuardState, HostResolver, NavigationBlockedError, NavigationGuard, Handler, installNavigationGuard(), isPrivateAddress(), isTopLevel() (+19 more)

### Community 21 - "Company Parser"
Cohesion: 0.22
Nodes (6): CheerioRoot, LinkedInCompany, LinkedInCompanyParser, COMPANY_SELECTOR_VERSION, FIXTURE, company.html fixture (LinkedIn company page)

### Community 25 - "Fixture Capture Script"
Cohesion: 0.24
Nodes (9): ParsedProxy, capture(), launchContext(), main(), parseProxy(), FIXTURES_DIR, stealth, StealthPlugin (+1 more)

### Community 3 - "Health, Metrics & Alerts"
Cohesion: 0.07
Nodes (14): HealthController, MetricsController, MetricsService, MonitoringModule, @nestjs/terminus, prom-client, Prometheus Metrics (scraper_jobs_total, block rate, duration, pool size), Prometheus alert group 'scraper' (+6 more)

### Community 38 - "Job Status Enum"
Cohesion: 0.33
Nodes (6): JobStatus, ACTIVE, COMPLETED, DELAYED, FAILED, PENDING

### Community 4 - "Fingerprint & Browser Context"
Cohesion: 0.08
Nodes (19): BrowserProfile, FingerprintService, BrowserFactoryService, CreatedContext, ProxyConfig, errorMessage(), redactWsToken(), makeBrowser() (+11 more)

### Community 36 - "Pixelscan Header Diag"
Cohesion: 0.40
Nodes (5): main(), patchAll(), SMOKE_SEC_CH_UA_HEADERS, stealth, StealthPlugin

### Community 41 - "Pixelscan Mock Diag"
Cohesion: 0.50
Nodes (4): main(), runTest(), stealth, StealthPlugin

### Community 42 - "Pixelscan JS Search"
Cohesion: 0.40
Nodes (3): stealth, StealthPlugin, TARGET_JS

### Community 6 - "Pixelscan Stealth Diagnostics"
Cohesion: 0.07
Nodes (18): stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin (+10 more)

### Community 7 - "Pixelscan Persistent Diagnostics"
Cohesion: 0.09
Nodes (15): stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin (+7 more)

### Community 10 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, axios, bullmq, cheerio, class-transformer, class-validator, ioredis, @nestjs/bullmq (+16 more)

### Community 11 - "Dev Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, eslint, eslint-config-prettier, eslint-plugin-prettier, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing (+14 more)

### Community 12 - "npm Scripts"
Cohesion: 0.10
Nodes (21): scripts, build, capture:fixtures, capture:fixtures:headful, format, lint, lint:fix, smoke:phase3 (+13 more)

### Community 13 - "Coverage Gate Thresholds"
Cohesion: 0.10
Nodes (20): global, ./src/scraper/security/, branches, functions, lines, statements, jest, collectCoverageFrom (+12 more)

### Community 35 - "Nest CLI Config"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 5 - "Lint & Package Config"
Cohesion: 0.06
Nodes (34): author, description, license, name, private, version, eslint, eslint-config-prettier (+26 more)

### Community 8 - "Docker Compose Stack"
Cohesion: 0.10
Nodes (25): entrypoint.sh script, { chromium }, Compose Service: app, Compose Network: backend, Compose Service: browser (SSRF boundary), Compose Network: browser, Compose Service: grafana (monitoring profile), Compose Service: postgres (16-alpine) (+17 more)

### Community 9 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+16 more)

### Community 31 - "Phases 2-3 Anti-Detection"
Cohesion: 0.25
Nodes (7): Block Detection & Retry Loop, Phase 2 — Browser Layer, Phase 3 — Anti-Detection Hardening, Proxy Health-Aware Rotation, Stealth addInitScript Patches, Implementation Phases, profile.html fixture (LinkedIn guest profile / authwall)

### Community 40 - "Phase 5 Reliability"
Cohesion: 0.40
Nodes (5): Circuit Breaker (5 failures, 5-min half-open), Dead Letter Queue (removeOnFail false), Graceful Shutdown (destroyAll on SIGTERM), Phase 5 — Hardening & Observability, Redis URL Cache (24h TTL)

## Ambiguous Edges - Review These
- `CreateScrapeResults1760500000000` → `Phase 1 — Foundation`  [AMBIGUOUS]
  IMPLEMENTATION_PHASES.md · relation: references
- `profile.html fixture (LinkedIn guest profile / authwall)` → `Block Detection & Retry Loop`  [AMBIGUOUS]
  src/pipeline/parsers/__fixtures__/profile.html · relation: conceptually_related_to

## Knowledge Gaps
- **257 isolated node(s):** `entrypoint.sh script`, `{ chromium }`, `$schema`, `collection`, `sourceRoot` (+252 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 398 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CreateScrapeResults1760500000000` and `Phase 1 — Foundation`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `profile.html fixture (LinkedIn guest profile / authwall)` and `Block Detection & Retry Loop`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `@nestjs/common` connect `App Bootstrap & Core Deps` to `TypeORM Entity & Storage`, `Health, Metrics & Alerts`, `Fingerprint & Browser Context`, `API Module Wiring`, `Lint & Package Config`, `Targets & Normalizer`, `Request DTO Deps`, `Circuit Breaker & Metrics Calls`, `Company Parser`, `Session Manager`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `playwright` connect `App Bootstrap & Core Deps` to `SSRF Defence`, `Pixelscan Header Diag`, `Lint & Package Config`, `Pixelscan Stealth Diagnostics`, `Fingerprint & Browser Context`, `Pixelscan Mock Diag`, `Phase 3 Smoke Test`, `Stealth Smoke Test`, `Fixture Capture Script`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `playwright-extra` connect `Pixelscan Stealth Diagnostics` to `Pixelscan Header Diag`, `Lint & Package Config`, `Fingerprint & Browser Context`, `Pixelscan Persistent Diagnostics`, `Pixelscan Mock Diag`, `Pixelscan JS Search`, `Pixelscan JS Fetcher`, `Phase 3 Smoke Test`, `Stealth Smoke Test`, `Fixture Capture Script`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `entrypoint.sh script`, `{ chromium }`, `$schema` to the rest of the system?**
  _257 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Bootstrap & Core Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.050616050616050616 - nodes in this community are weakly interconnected._