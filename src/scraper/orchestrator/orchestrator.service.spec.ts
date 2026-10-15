import { OrchestratorService } from './orchestrator.service';
import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';
import { MetricsService } from '../../monitoring/metrics.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

const URL = 'https://www.linkedin.com/in/someone/';

function makePage(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    goto: jest.fn().mockResolvedValue({ status: () => 200 }),
    waitForLoadState: jest.fn().mockResolvedValue(undefined),
    url: jest.fn().mockReturnValue(URL),
    title: jest.fn().mockResolvedValue('Someone | LinkedIn'),
    content: jest.fn().mockResolvedValue('<html></html>'),
    close: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setup(page = makePage()) {
  const context = { newPage: jest.fn().mockResolvedValue(page) };
  const deps = {
    browserPool: {
      acquire: jest.fn().mockResolvedValue(context),
      release: jest.fn(),
      destroy: jest.fn().mockResolvedValue(undefined),
      poolSize: jest.fn().mockReturnValue(1),
    },
    humanSimulator: {
      wanderMouse: jest.fn().mockResolvedValue(undefined),
      simulateReading: jest.fn().mockResolvedValue(undefined),
      humanScroll: jest.fn().mockResolvedValue(undefined),
    },
    captcha: { solveOnPage: jest.fn().mockResolvedValue({ solved: false }) },
    proxy: { getNext: jest.fn().mockReturnValue(null), markBanned: jest.fn(), markSuccess: jest.fn() },
    normalizer: { normalize: jest.fn((_t: string, raw: Record<string, unknown>) => ({ ...raw, normalized: true })) },
    storage: { save: jest.fn().mockResolvedValue({}) },
    profileParser: { parse: jest.fn().mockReturnValue({ name: 'Someone' }) },
    jobsParser: { parse: jest.fn() },
    companyParser: { parse: jest.fn() },
    circuitBreaker: new CircuitBreakerService(),
    urlCache: { isCached: jest.fn().mockResolvedValue(false), markCached: jest.fn().mockResolvedValue(undefined) },
    metrics: new MetricsService(),
    session: { inject: jest.fn().mockResolvedValue(undefined) },
  };
  const service = new OrchestratorService(
    deps.browserPool as never,
    deps.humanSimulator as never,
    deps.captcha as never,
    deps.proxy as never,
    deps.normalizer as never,
    deps.storage as never,
    deps.profileParser as never,
    deps.jobsParser as never,
    deps.companyParser as never,
    deps.circuitBreaker,
    deps.urlCache as never,
    deps.metrics,
    deps.session as never,
  );
  return { service, deps, context, page };
}

const job = { jobId: '42', url: URL, target: ScraperTarget.LINKEDIN_PROFILE, metadata: {} };

describe('OrchestratorService', () => {
  it('scrapes, stores the result with the job id, and releases the context', async () => {
    const { service, deps, context } = setup();

    const result = await service.run(job);

    expect(result).toEqual({ name: 'Someone', normalized: true });
    expect(deps.storage.save).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: '42', url: URL, status: 'success' }),
    );
    expect(deps.browserPool.release).toHaveBeenCalledWith(context);
    expect(deps.urlCache.markCached).toHaveBeenCalledWith(URL);
  });

  it('returns early on a cache hit without opening a browser', async () => {
    const { service, deps } = setup();
    deps.urlCache.isCached.mockResolvedValue(true);

    expect(await service.run(job)).toEqual({ cached: true, url: URL });
    expect(deps.browserPool.acquire).not.toHaveBeenCalled();
  });

  it('stores a parse error instead of retrying when the parser throws', async () => {
    const { service, deps } = setup();
    deps.profileParser.parse.mockImplementation(() => {
      throw new Error('selector missing');
    });

    const result = await service.run(job);

    expect(result).toEqual({ parseError: true, error: 'selector missing' });
    expect(deps.storage.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(deps.browserPool.acquire).toHaveBeenCalledTimes(1);
  });

  it('retries 3 times on block, destroys contexts, bans the proxy, then throws', async () => {
    const page = makePage({ goto: jest.fn().mockResolvedValue({ status: () => 429 }) });
    const { service, deps } = setup(page);
    const proxy = { server: 'http://p:1' };
    deps.proxy.getNext.mockReturnValue(proxy);

    await expect(service.run(job)).rejects.toThrow('HTTP 429');

    expect(deps.browserPool.acquire).toHaveBeenCalledTimes(3);
    expect(deps.browserPool.destroy).toHaveBeenCalledTimes(3);
    expect(deps.proxy.markBanned).toHaveBeenCalledWith(proxy);
    expect(page.close).toHaveBeenCalledTimes(3);
  });

  it('detects auth-wall redirects as blocks', async () => {
    const page = makePage({ url: jest.fn().mockReturnValue('https://www.linkedin.com/authwall?x=1') });
    const { service } = setup(page);
    await expect(service.run(job)).rejects.toThrow(/Blocked/);
  });

  it('destroys the context if session injection fails (no leak)', async () => {
    const { service, deps } = setup();
    deps.session.inject.mockRejectedValue(new Error('bad cookies'));

    await expect(service.run(job)).rejects.toThrow('bad cookies');
    expect(deps.browserPool.destroy).toHaveBeenCalledTimes(3);
  });

  it('rejects immediately when the circuit is open', async () => {
    const { service, deps } = setup();
    for (let i = 0; i < 5; i++) deps.circuitBreaker.recordFailure('www.linkedin.com');

    await expect(service.run(job)).rejects.toThrow(/Circuit open/);
    expect(deps.browserPool.acquire).not.toHaveBeenCalled();
  });
});
