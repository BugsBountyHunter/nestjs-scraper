import { Injectable, Logger } from '@nestjs/common';
import { BrowserPoolService } from '../browser/browser-pool.service';
import { HumanSimulatorService } from '../anti-detection/human-simulator/human-simulator.service';
import { DataNormalizerService } from '../../pipeline/normalizers/data-normalizer.service';
import { StorageService } from '../../pipeline/storage/storage.service';
import { LinkedInProfileParser } from '../../pipeline/parsers/linkedin-profile.parser';
import { LinkedInJobsParser } from '../../pipeline/parsers/linkedin-jobs.parser';
import { ScrapeJobData } from './orchestrator.processor';
import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly browserPool: BrowserPoolService,
    private readonly humanSimulator: HumanSimulatorService,
    private readonly normalizer: DataNormalizerService,
    private readonly storage: StorageService,
    private readonly profileParser: LinkedInProfileParser,
    private readonly jobsParser: LinkedInJobsParser,
  ) {}

  async run(jobData: ScrapeJobData): Promise<unknown> {
    const context = await this.browserPool.acquire();
    const page = await context.newPage();

    try {
      this.logger.log(`Navigating to ${jobData.url}`);
      await page.goto(jobData.url, { waitUntil: 'domcontentloaded' });
      await this.humanSimulator.simulateReading(page);
      await this.humanSimulator.humanScroll(page);

      const rawHtml = await page.content();
      const rawData = await this.parse(jobData.target, rawHtml, jobData.url);
      const normalized = this.normalizer.normalize(jobData.target, rawData);

      await this.storage.save({
        target: jobData.target,
        url: jobData.url,
        data: normalized,
        metadata: jobData.metadata,
      });

      this.browserPool.release(context);
      return normalized;
    } catch (err) {
      this.logger.error(`Scrape failed for ${jobData.url}`, err);
      await this.browserPool.destroy(context);
      throw err;
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  private async parse(
    target: ScraperTarget,
    html: string,
    url: string,
  ): Promise<Record<string, unknown>> {
    switch (target) {
      case ScraperTarget.LINKEDIN_PROFILE:
        return this.profileParser.parse(html, url);
      case ScraperTarget.LINKEDIN_JOBS:
        return this.jobsParser.parse(html, url);
      default:
        return { raw: html.slice(0, 500) };
    }
  }
}
