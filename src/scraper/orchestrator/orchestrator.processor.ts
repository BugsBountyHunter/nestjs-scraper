import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { OrchestratorService } from './orchestrator.service';
import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';

export interface ScrapeJobData {
  jobId?: string;
  url: string;
  target: ScraperTarget;
  metadata: Record<string, unknown>;
}

const DEFAULT_CONCURRENCY = 2;

@Processor({ name: 'scraper' })
export class OrchestratorProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(OrchestratorProcessor.name);

  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  // Read concurrency after ConfigModule has loaded .env — a decorator option
  // would be evaluated at import time, before .env is parsed.
  onModuleInit(): void {
    const concurrency = Number(this.config.get('SCRAPER_CONCURRENCY', DEFAULT_CONCURRENCY));
    this.worker.concurrency = Number.isInteger(concurrency) && concurrency > 0 ? concurrency : DEFAULT_CONCURRENCY;
    this.logger.log(`Worker concurrency: ${this.worker.concurrency}`);
  }

  async process(job: Job<ScrapeJobData>): Promise<unknown> {
    this.logger.log(`Processing job ${job.id} — target: ${job.data.target} — url: ${job.data.url}`);
    await job.updateProgress(10);

    const result = await this.orchestratorService.run({ ...job.data, jobId: job.id });
    await job.updateProgress(100);

    return result;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    const isPermanent = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (isPermanent) {
      this.logger.error(
        `Job ${job.id} permanently failed after ${job.attemptsMade} attempts: ${error.message}`,
        error.stack,
      );
    } else {
      this.logger.warn(`Job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`);
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`Job ${jobId} stalled`);
  }
}
