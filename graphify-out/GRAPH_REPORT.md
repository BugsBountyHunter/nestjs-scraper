# Graph Report - nestjs-scraper  (2026-10-15)

## Corpus Check
- 104 files · ~71,483 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 802 nodes · 1383 edges · 58 communities (36 shown, 22 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.84)
- Token cost: 92,979 input · 0 output

## Community Hubs (Navigation)
- Browser Isolation & Phases
- Lint & Jest Config
- SSRF Guard & Orchestrator Tests
- Orchestrator, Worker & Human Sim
- Pixelscan Persistent Diagnostics
- Pixelscan Canvas Diagnostics
- TypeScript Config
- Runtime Dependencies
- Profile Parser & Block Detection
- Dev Dependencies
- Company & Jobs Parsers
- npm Scripts
- Scraper Module Wiring
- TypeORM Entity
- App Bootstrap
- Phase 3 Smoke Test
- Fingerprint Service
- Results Controller
- Jobs Controller
- Stealth Smoke Test
- Request DTOs & URL Validation
- CAPTCHA Types & Config
- Health & Metrics Deps
- Browser Factory
- Targets & Normalizer
- Proxy Rotation
- Jobs Service
- Circuit Breaker
- Session Manager
- Metrics Controller
- Fixture Capture Script
- Compose Backend & Monitoring
- CAPTCHA Solving
- Resilience & Alerts
- Browser Context Pool
- Validation Decorators
- Health Controller
- Redis URL Cache
- API Module Wiring
- Pagination DTO
- Nest CLI Config
- DB Migrations
- Pixelscan Header Diag
- Job Status Enum
- LinkedIn Cookie Session
- Pixelscan Mock Diag
- Pixelscan JS Search
- Stealth Validation Findings
- Phase 5 Observability
- Pixelscan JS Fetcher
- Pixelscan JS Hunt

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 42 edges
2. `OrchestratorService` - 24 edges
3. `playwright-extra` - 24 edges
4. `puppeteer-extra-plugin-stealth` - 23 edges
5. `ScrapeResult` - 23 edges
6. `scripts` - 21 edges
7. `BrowserFactoryService` - 20 edges
8. `compilerOptions` - 19 edges
9. `playwright` - 18 edges
10. `MetricsService` - 17 edges

## Surprising Connections (you probably didn't know these)
- `ScraperJobsFailing alert` --shares_data_with--> `MetricsService`  [INFERRED]
  infra/prometheus/alerts.yml → src/monitoring/metrics.service.ts
- `Prometheus Metrics (/metrics)` --references--> `MetricsService`  [INFERRED]
  README.md → src/monitoring/metrics.service.ts
- `BullMQ Job Queue` --conceptually_related_to--> `OrchestratorService`  [INFERRED]
  README.md → src/scraper/orchestrator/orchestrator.service.ts
- `In-app Navigation Guard` --conceptually_related_to--> `NavigationBlockedError`  [INFERRED]
  README.md → src/scraper/security/navigation-guard.ts
- `prometheus service` --shares_data_with--> `MetricsService`  [INFERRED]
  docker-compose.yml → src/monitoring/metrics.service.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Orchestrator anti-detection scrape flow** — src_scraper_orchestrator_orchestrator_service_orchestratorservice, src_scraper_anti_detection_human_simulator_human_simulator_service_humansimulatorservice, src_scraper_anti_detection_captcha_captcha_service_captchaservice, src_scraper_proxy_proxy_rotator_service_proxyrotatorservice, implementation_phases_block_detection, implementation_phases_retry_loop [INFERRED 0.85]
- **SSRF Defense in Depth (submit-time URL policy + runtime navigation guard)** — readme_ssrf_protection, src_scraper_security_url_policy_isallowedtargeturl, src_scraper_security_url_policy_isinternalurl, src_scraper_security_navigation_guard_installnavigationguard, src_scraper_security_navigation_guard_navigationblockederror [INFERRED 0.85]
- **Prometheus/Grafana observability stack** — src_monitoring_metrics_service_metricsservice, infra_prometheus_prometheus_nestjs_scraper_job, infra_prometheus_alerts_scraper_group, docker_compose_prometheus, docker_compose_grafana, infra_grafana_provisioning_datasources_prometheus_datasource [INFERRED 0.95]
- **LinkedIn parser fixture-based unit tests** — src_pipeline_parsers___fixtures___company_fixture, src_pipeline_parsers___fixtures___jobs_fixture, src_pipeline_parsers___fixtures___profile_fixture, src_pipeline_parsers___fixtures___profile_synthetic_fixture, src_pipeline_parsers_linkedin_profile_parser_linkedinprofileparser, src_pipeline_parsers_linkedin_jobs_parser_linkedinjobsparser, src_pipeline_parsers_linkedin_company_parser_linkedincompanyparser [INFERRED 0.95]
- **Layered SSRF defence (URL validation, in-app guard, network isolation)** — readme_job_url_validation, readme_in_app_navigation_guard, readme_network_isolation, readme_browser_egress_firewall, src_scraper_security_url_policy_isallowedtargeturl, src_scraper_security_navigation_guard_installnavigationguard [EXTRACTED 1.00]
- **Remote browser over token-protected websocket in isolated container** — docker_compose_app, docker_compose_browser, docker_compose_browser_network, readme_token_protected_websocket, infra_browser_server, infra_browser_entrypoint, src_scraper_browser_browser_factory_service_browserfactoryservice [INFERRED 0.85]
- **Opt-in monitoring stack** — docker_compose_prometheus, docker_compose_grafana, docker_compose_monitoring_profile, readme_prometheus_metrics, src_monitoring_metrics_service_metricsservice [INFERRED 0.85]

## Communities (58 total, 22 thin omitted)

### Community 0 - "Browser Isolation & Phases"
Cohesion: 0.06
Nodes (28): browser service, browser network, EGRESS_ALLOW exemptions, Akamai Bot Manager, DataDome, Implementation Phases (NestJS Scraper), Legal notice (LinkedIn ToS, GDPR, CFAA), Phase 1 - Foundation (+20 more)

### Community 1 - "Lint & Jest Config"
Cohesion: 0.05
Nodes (42): author, description, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment (+34 more)

### Community 2 - "SSRF Guard & Orchestrator Tests"
Cohesion: 0.08
Nodes (29): job, mockedInstallGuard, passGuard, setup(), ContextGuardState, HostResolver, installedContexts, installNavigationGuard() (+21 more)

### Community 3 - "Orchestrator, Worker & Human Sim"
Cohesion: 0.09
Nodes (3): HumanSimulatorService, OrchestratorProcessor, OrchestratorService

### Community 4 - "Pixelscan Persistent Diagnostics"
Cohesion: 0.10
Nodes (14): stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin (+6 more)

### Community 5 - "Pixelscan Canvas Diagnostics"
Cohesion: 0.08
Nodes (16): playwright-extra, puppeteer-extra-plugin-stealth, stealth, StealthPlugin, stealth, StealthPlugin, stealth, StealthPlugin (+8 more)

### Community 6 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+16 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, axios, bullmq, cheerio, class-transformer, class-validator, ioredis, @nestjs/bullmq (+16 more)

### Community 8 - "Profile Parser & Block Detection"
Cohesion: 0.13
Nodes (10): profile.html fixture (LinkedIn guest profile / authwall), profile-synthetic.html fixture (synthetic logged-in profile), CheerioEl, CheerioRoot, EducationEntry, ExperienceEntry, LinkedInProfile, LinkedInProfileParser (+2 more)

### Community 9 - "Dev Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, eslint, eslint-config-prettier, eslint-plugin-prettier, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing (+14 more)

### Community 10 - "Company & Jobs Parsers"
Cohesion: 0.12
Nodes (11): cheerio, company.html fixture (LinkedIn company page), jobs.html fixture (LinkedIn jobs search), CheerioRoot, COMPANY_SELECTOR_VERSION, LinkedInCompany, LinkedInCompanyParser, FIXTURE (+3 more)

### Community 11 - "npm Scripts"
Cohesion: 0.10
Nodes (21): scripts, build, capture:fixtures, capture:fixtures:headful, format, lint, lint:fix, smoke:phase3 (+13 more)

### Community 12 - "Scraper Module Wiring"
Cohesion: 0.21
Nodes (7): @nestjs/common, AntiDetectionModule, BrowserModule, CacheModule, OrchestratorModule, ProxyModule, SessionModule

### Community 13 - "TypeORM Entity"
Cohesion: 0.18
Nodes (4): @nestjs/typeorm, ScrapeResult, SaveResultInput, StorageService

### Community 14 - "App Bootstrap"
Cohesion: 0.12
Nodes (8): @nestjs/bullmq, @nestjs/core, AppModule, MonitoringModule, PipelineModule, StorageModule, QueueModule, ScraperModule

### Community 15 - "Phase 3 Smoke Test"
Cohesion: 0.17
Nodes (19): BLOCK_TITLE_PATTERNS, BLOCK_URL_PATTERNS, CAPTCHA_SELECTORS, checkLinkedInPage(), checkProxyRotation(), CheckResult, fail(), getMyIp() (+11 more)

### Community 16 - "Fingerprint Service"
Cohesion: 0.13
Nodes (11): BrowserProfile, FingerprintService, LOCALES, PLATFORMS, TIMEZONES, USER_AGENTS, VIEWPORTS, makeBrowser() (+3 more)

### Community 19 - "Stealth Smoke Test"
Cohesion: 0.26
Nodes (15): CheckResult, fail(), main(), pass(), patchHeadlessSignals(), patchUserAgentData(), patchWebGLConsistency(), printReport() (+7 more)

### Community 20 - "Request DTOs & URL Validation"
Cohesion: 0.22
Nodes (8): class-transformer, class-validator, @nestjs/swagger, MAX_PAGE_SIZE, IsAllowedTargetUrl(), JOB_PRIORITIES, JobPriority, PRIORITY_MAP

### Community 21 - "CAPTCHA Types & Config"
Cohesion: 0.19
Nodes (9): axios, @nestjs/config, CaptchaResult, CaptchaType, DetectedCaptcha, Point, ScrapeJobData, BLOCK_TITLE_PATTERNS (+1 more)

### Community 22 - "Health & Metrics Deps"
Cohesion: 0.22
Nodes (5): Prometheus scraper metrics (scraper_jobs_total, scraper_block_rate, scraper_job_duration_seconds, browser_pool_size), bullmq, @nestjs/terminus, prom-client, MetricsService

### Community 23 - "Browser Factory"
Cohesion: 0.21
Nodes (8): playwright, CHROMIUM_ARGS, CreatedContext, stealth, StealthPlugin, PoolEntry, ProxyConfig, ProxyEntry

### Community 24 - "Targets & Normalizer"
Cohesion: 0.26
Nodes (5): ScraperTarget, LINKEDIN_COMPANY, LINKEDIN_JOBS, LINKEDIN_PROFILE, DataNormalizerService

### Community 25 - "Proxy Rotation"
Cohesion: 0.17
Nodes (3): Residential proxy providers (Bright Data / Oxylabs / Smartproxy), parseProxyEntry(), ProxyRotatorService

### Community 27 - "Circuit Breaker"
Cohesion: 0.20
Nodes (3): CircuitBreakerModule, CircuitBreakerService, DomainState

### Community 30 - "Fixture Capture Script"
Cohesion: 0.24
Nodes (9): capture(), FIXTURES_DIR, launchContext(), main(), ParsedProxy, parseProxy(), stealth, StealthPlugin (+1 more)

### Community 31 - "Compose Backend & Monitoring"
Cohesion: 0.40
Nodes (10): app service, backend network, grafana service, monitoring profile, postgres service, prometheus service, redis service, docker-compose stack (+2 more)

### Community 33 - "Resilience & Alerts"
Cohesion: 0.22
Nodes (8): Horizontal worker scaling (--scale app=N), Prometheus alert group 'scraper', ScraperDown alert, ScraperHighBlockRate alert, ScraperJobsFailing alert, ScraperQueueBacklog alert, Prometheus scrape config, Prometheus job 'nestjs-scraper' (app:3000/metrics)

### Community 38 - "API Module Wiring"
Cohesion: 0.29
Nodes (3): ApiModule, JobsModule, ResultsModule

### Community 40 - "Nest CLI Config"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 42 - "Pixelscan Header Diag"
Cohesion: 0.40
Nodes (5): main(), patchAll(), SMOKE_SEC_CH_UA_HEADERS, stealth, StealthPlugin

### Community 43 - "Job Status Enum"
Cohesion: 0.33
Nodes (6): JobStatus, ACTIVE, COMPLETED, DELAYED, FAILED, PENDING

### Community 45 - "Pixelscan Mock Diag"
Cohesion: 0.50
Nodes (4): main(), runTest(), stealth, StealthPlugin

### Community 46 - "Pixelscan JS Search"
Cohesion: 0.40
Nodes (3): stealth, StealthPlugin, TARGET_JS

### Community 47 - "Stealth Validation Findings"
Cohesion: 0.50
Nodes (3): bot.sannysoft.com smoke check, pixelscan checkFingerprintMasking, Stealth smoke test (npm run smoke:stealth)

### Community 48 - "Phase 5 Observability"
Cohesion: 0.50
Nodes (3): Phase 5 - Hardening & Observability, Horizontal Worker Scaling (--scale app=3), Prometheus Metrics (/metrics)

## Ambiguous Edges - Review These
- `Block detection (checkpoint/authwall/login, 403/429)` → `profile.html fixture (LinkedIn guest profile / authwall)`  [AMBIGUOUS]
  src/pipeline/parsers/__fixtures__/profile.html · relation: conceptually_related_to

## Knowledge Gaps
- **251 isolated node(s):** `ContextGuardState`, `Handler`, `CheerioEl`, `CheerioRoot`, `EducationEntry` (+246 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 419 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Block detection (checkpoint/authwall/login, 403/429)` and `profile.html fixture (LinkedIn guest profile / authwall)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `@nestjs/common` connect `Scraper Module Wiring` to `Lint & Jest Config`, `API Module Wiring`, `Profile Parser & Block Detection`, `Company & Jobs Parsers`, `TypeORM Entity`, `App Bootstrap`, `Fingerprint Service`, `Request DTOs & URL Validation`, `CAPTCHA Types & Config`, `Health & Metrics Deps`, `Browser Factory`, `Targets & Normalizer`, `Circuit Breaker`, `Session Manager`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `playwright` connect `Browser Factory` to `Lint & Jest Config`, `SSRF Guard & Orchestrator Tests`, `Pixelscan Canvas Diagnostics`, `Pixelscan Header Diag`, `Pixelscan Mock Diag`, `Phase 3 Smoke Test`, `Pixelscan JS Hunt`, `Stealth Smoke Test`, `CAPTCHA Types & Config`, `Fixture Capture Script`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `playwright-extra` connect `Pixelscan Canvas Diagnostics` to `Lint & Jest Config`, `Pixelscan Persistent Diagnostics`, `Pixelscan Header Diag`, `Pixelscan Mock Diag`, `Pixelscan JS Search`, `Phase 3 Smoke Test`, `Fingerprint Service`, `Pixelscan JS Fetcher`, `Pixelscan JS Hunt`, `Stealth Smoke Test`, `Browser Factory`, `Fixture Capture Script`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `OrchestratorService` (e.g. with `BullMQ Job Queue` and `CaptchaService`) actually correct?**
  _`OrchestratorService` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ContextGuardState`, `Handler`, `CheerioEl` to the rest of the system?**
  _251 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Browser Isolation & Phases` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._