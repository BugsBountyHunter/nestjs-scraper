import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  const blockRate = async () => (await metrics.blockRate.get()).values[0].value;

  it('computes block rate over recorded requests', async () => {
    metrics.recordRequest(true);
    metrics.recordRequest(false);
    metrics.recordRequest(false);
    metrics.recordRequest(false);
    expect(await blockRate()).toBeCloseTo(0.25);
  });

  it('only keeps the last 100 requests in the window', async () => {
    for (let i = 0; i < 100; i++) metrics.recordRequest(true);
    for (let i = 0; i < 100; i++) metrics.recordRequest(false);
    expect(await blockRate()).toBe(0);
  });

  it('exposes all scraper metrics in Prometheus format', async () => {
    const text = await metrics.getMetrics();
    ['scraper_jobs_total', 'scraper_job_duration_seconds', 'scraper_block_rate', 'browser_pool_size', 'scraper_queue_depth'].forEach(
      (name) => expect(text).toContain(name),
    );
  });
});
