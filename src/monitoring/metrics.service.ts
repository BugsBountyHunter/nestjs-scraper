import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly jobsTotal = new Counter({
    name: 'scraper_jobs_total',
    help: 'Total scraping jobs processed',
    labelNames: ['target', 'status'] as const,
    registers: [this.registry],
  });

  readonly jobDurationSeconds = new Histogram({
    name: 'scraper_job_duration_seconds',
    help: 'Scraping job duration in seconds',
    labelNames: ['target'] as const,
    buckets: [1, 5, 15, 30, 60, 120],
    registers: [this.registry],
  });

  readonly blockRate = new Gauge({
    name: 'scraper_block_rate',
    help: 'Rolling block rate — blocked requests / total requests in last 100',
    registers: [this.registry],
  });

  readonly browserPoolSize = new Gauge({
    name: 'browser_pool_size',
    help: 'Number of active browser contexts currently in the pool',
    registers: [this.registry],
  });

  readonly queueDepth = new Gauge({
    name: 'scraper_queue_depth',
    help: 'Jobs waiting or delayed in the scraper queue',
    registers: [this.registry],
  });

  private blockWindow: boolean[] = [];
  private readonly WINDOW_SIZE = 100;

  recordRequest(blocked: boolean): void {
    this.blockWindow = [...this.blockWindow, blocked].slice(-this.WINDOW_SIZE);
    const rate = this.blockWindow.filter(Boolean).length / this.blockWindow.length;
    this.blockRate.set(rate);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
