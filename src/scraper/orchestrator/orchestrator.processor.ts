import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrchestratorService } from './orchestrator.service';
import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';

export interface ScrapeJobData {
  url: string;
  target: ScraperTarget;
  metadata: Record<string, unknown>;
}

@Processor('scraper')
export class OrchestratorProcessor extends WorkerHost {
  private readonly logger = new Logger(OrchestratorProcessor.name);

  constructor(private readonly orchestratorService: OrchestratorService) {
    super();
  }

  async process(job: Job<ScrapeJobData>): Promise<unknown> {
    this.logger.log(`Processing job ${job.id} — target: ${job.data.target} — url: ${job.data.url}`);
    await job.updateProgress(10);

    const result = await this.orchestratorService.run(job.data);
    await job.updateProgress(100);

    return result;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`Job ${jobId} stalled`);
  }
}
