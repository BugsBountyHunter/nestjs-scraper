import { Injectable, Logger } from '@nestjs/common';
import type { BrowserContext, Page } from 'playwright';
import { BrowserPoolService } from '../browser/browser-pool.service';
import { HumanSimulatorService } from '../anti-detection/human-simulator/human-simulator.service';
import { CaptchaService } from '../anti-detection/captcha/captcha.service';
import { ProxyRotatorService, ProxyConfig } from '../proxy/proxy-rotator.service';
import { DataNormalizerService } from '../../pipeline/normalizers/data-normalizer.service';
import { StorageService } from '../../pipeline/storage/storage.service';
import { LinkedInProfileParser } from '../../pipeline/parsers/linkedin-profile.parser';
import { LinkedInJobsParser } from '../../pipeline/parsers/linkedin-jobs.parser';
import { LinkedInCompanyParser } from '../../pipeline/parsers/linkedin-company.parser';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { UrlCacheService } from '../cache/url-cache.service';
import { MetricsService } from '../../monitoring/metrics.service';
import { LinkedInSessionService } from '../session/linkedin-session.service';
import { ScrapeJobData } from './orchestrator.processor';
import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';

const MAX_RETRIES = 3;

const BLOCK_URL_PATTERNS = [
  '/checkpoint/',
  '/login',
  '/authwall',
  '/challenge',
  '/uas/login',
];

const BLOCK_TITLE_PATTERNS = [
  'security check',
  'verify you are human',
  'access denied',
  'blocked',
  '403',
  '429',
];

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly browserPool: BrowserPoolService,
    private readonly humanSimulator: HumanSimulatorService,
    private readonly captchaService: CaptchaService,
    private readonly proxyRotator: ProxyRotatorService,
    private readonly normalizer: DataNormalizerService,
    private readonly storage: StorageService,
    private readonly profileParser: LinkedInProfileParser,
    private readonly jobsParser: LinkedInJobsParser,
    private readonly companyParser: LinkedInCompanyParser,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly urlCache: UrlCacheService,
    private readonly metrics: MetricsService,
    private readonly linkedInSession: LinkedInSessionService,
  ) {}

  async run(jobData: ScrapeJobData): Promise<unknown> {
    const domain = new URL(jobData.url).hostname;

    if (this.circuitBreaker.isOpen(domain)) {
      this.metrics.jobsTotal.inc({ target: jobData.target, status: 'circuit_open' });
      throw new Error(`Circuit open for ${domain} — skipping job`);
    }

    if (await this.urlCache.isCached(jobData.url)) {
      this.logger.log(`Cache hit — skipping ${jobData.url}`);
      this.metrics.jobsTotal.inc({ target: jobData.target, status: 'cached' });
      return { cached: true, url: jobData.url };
    }

    const startTime = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const context = await this.browserPool.acquire();
      this.metrics.browserPoolSize.set(this.browserPool.poolSize());
      const proxy = this.proxyRotator.getNext();
      let page: Page | undefined;

      try {
        await this.linkedInSession.inject(context);
        page = await context.newPage();
        const result = await this.scrapeWithContext(page, context, jobData, proxy, attempt);

        this.circuitBreaker.recordSuccess(domain);
        await this.urlCache.markCached(jobData.url);
        this.metrics.jobsTotal.inc({ target: jobData.target, status: 'success' });
        this.metrics.jobDurationSeconds.observe({ target: jobData.target }, (Date.now() - startTime) / 1000);
        this.metrics.recordRequest(false);

        if (proxy) this.proxyRotator.markSuccess(proxy);
        return result;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${msg}`);

        if (proxy && this.isBlockError(msg)) {
          this.proxyRotator.markBanned(proxy);
          this.metrics.recordRequest(true);
        }

        await this.browserPool.destroy(context);
        this.metrics.browserPoolSize.set(this.browserPool.poolSize());
      } finally {
        await page?.close().catch(() => undefined);
      }
    }

    this.circuitBreaker.recordFailure(domain);
    this.metrics.jobsTotal.inc({ target: jobData.target, status: 'failed' });
    this.metrics.jobDurationSeconds.observe({ target: jobData.target }, (Date.now() - startTime) / 1000);

    throw lastError;
  }

  private async scrapeWithContext(
    page: Page,
    context: BrowserContext,
    jobData: ScrapeJobData,
    proxy: ProxyConfig | null,
    attempt: number,
  ): Promise<unknown> {
    this.logger.log(`[attempt ${attempt + 1}] Navigating to ${jobData.url}`);

    const response = await page.goto(jobData.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const httpStatus = response?.status() ?? 0;
    if (httpStatus === 429 || httpStatus === 403) {
      throw new Error(`HTTP ${httpStatus} on ${jobData.url}`);
    }

    // Wait for client-side redirects (e.g. LinkedIn SPA auth-wall) to settle
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);

    await this.checkAndHandleBlock(page, proxy);
    await this.checkAndSolveCaptcha(page);

    await this.humanSimulator.wanderMouse(page, 2);
    await this.humanSimulator.simulateReading(page);
    await this.humanSimulator.humanScroll(page);

    const rawHtml = await page.content();
    const { data, status } = this.parseSafely(jobData, rawHtml);

    await this.storage.save({
      jobId: jobData.jobId,
      target: jobData.target,
      url: jobData.url,
      data,
      metadata: jobData.metadata,
      status,
    });

    this.browserPool.release(context);
    return data;
  }

  /**
   * Parser failures are stored as `status: 'failed'` with `parseError: true`
   * instead of retrying — the page loaded fine, so a retry would only burn
   * proxy bandwidth on the same broken selectors.
   */
  private parseSafely(
    jobData: ScrapeJobData,
    html: string,
  ): { data: Record<string, unknown>; status: 'success' | 'failed' } {
    try {
      const rawData = this.parse(jobData.target, html, jobData.url);
      return { data: this.normalizer.normalize(jobData.target, rawData), status: 'success' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Parse error for ${jobData.url}: ${message}`);
      return { data: { parseError: true, error: message }, status: 'failed' };
    }
  }

  private async checkAndHandleBlock(page: Page, proxy: ProxyConfig | null): Promise<void> {
    const url = page.url();
    const title = (await page.title()).toLowerCase();

    const urlBlocked = BLOCK_URL_PATTERNS.some((p) => url.includes(p));
    const titleBlocked = BLOCK_TITLE_PATTERNS.some((p) => title.includes(p));

    if (urlBlocked || titleBlocked) {
      if (proxy) this.proxyRotator.markBanned(proxy);
      throw new Error(`Blocked — redirected to ${url} (title: "${title}")`);
    }
  }

  private async checkAndSolveCaptcha(page: Page): Promise<void> {
    const result = await this.captchaService.solveOnPage(page);
    if (!result.solved) return;

    await page.evaluate((token: string) => {
      const ta = document.querySelector<HTMLTextAreaElement>('[name="g-recaptcha-response"], [name="h-captcha-response"]');
      if (ta) {
        ta.value = token;
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, result.token ?? '');

    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => undefined);
  }

  private isBlockError(message: string): boolean {
    return (
      message.includes('HTTP 429') ||
      message.includes('HTTP 403') ||
      message.includes('Blocked') ||
      message.includes('/checkpoint/') ||
      message.includes('/authwall')
    );
  }

  private parse(target: ScraperTarget, html: string, url: string): Record<string, unknown> {
    switch (target) {
      case ScraperTarget.LINKEDIN_PROFILE:
        return this.profileParser.parse(html, url);
      case ScraperTarget.LINKEDIN_JOBS:
        return this.jobsParser.parse(html, url);
      case ScraperTarget.LINKEDIN_COMPANY:
        return this.companyParser.parse(html, url);
      default:
        return { raw: html.slice(0, 500) };
    }
  }
}
