import { Controller, Get, Logger, Res } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(
    private readonly metrics: MetricsService,
    @InjectQueue('scraper') private readonly scraperQueue: Queue,
  ) {}

  @Get()
  async scrape(@Res() res: Response): Promise<void> {
    await this.refreshQueueDepth();
    res.set('Content-Type', this.metrics.contentType());
    res.end(await this.metrics.getMetrics());
  }

  private async refreshQueueDepth(): Promise<void> {
    try {
      const counts = await this.scraperQueue.getJobCounts('waiting', 'delayed', 'prioritized');
      this.metrics.queueDepth.set(Object.values(counts).reduce((sum, n) => sum + n, 0));
    } catch (err) {
      this.logger.warn(`Failed to read queue depth: ${(err as Error).message}`);
    }
  }
}
