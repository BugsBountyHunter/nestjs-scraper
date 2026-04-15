import { BrowserPoolService } from './browser-pool.service';
import type { BrowserContext } from 'playwright';

// Minimal mock for a BrowserContext
function makeMockContext(): jest.Mocked<BrowserContext> {
  return { close: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<BrowserContext>;
}

describe('BrowserPoolService', () => {
  let pool: BrowserPoolService;
  let mockFactory: { createContext: jest.Mock };
  let mockProxyRotator: { getNext: jest.Mock };

  beforeEach(() => {
    mockFactory = { createContext: jest.fn() };
    mockProxyRotator = { getNext: jest.fn().mockReturnValue(null) };

    pool = new BrowserPoolService(
      mockFactory as never,
      mockProxyRotator as never,
    );
  });

  afterEach(async () => {
    await pool.destroyAll();
  });

  describe('acquire()', () => {
    it('creates a new context when pool is empty', async () => {
      const ctx = makeMockContext();
      mockFactory.createContext.mockResolvedValueOnce({ context: ctx, profile: {} });

      const result = await pool.acquire();

      expect(mockFactory.createContext).toHaveBeenCalledTimes(1);
      expect(result).toBe(ctx);
    });

    it('reuses an idle context instead of creating a new one', async () => {
      const ctx = makeMockContext();
      mockFactory.createContext.mockResolvedValueOnce({ context: ctx, profile: {} });

      const first = await pool.acquire();
      pool.release(first);
      const second = await pool.acquire();

      expect(mockFactory.createContext).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it('creates a second context when first is still in use', async () => {
      const ctx1 = makeMockContext();
      const ctx2 = makeMockContext();
      mockFactory.createContext
        .mockResolvedValueOnce({ context: ctx1, profile: {} })
        .mockResolvedValueOnce({ context: ctx2, profile: {} });

      const a = await pool.acquire();
      const b = await pool.acquire();

      expect(mockFactory.createContext).toHaveBeenCalledTimes(2);
      expect(a).not.toBe(b);
    });
  });

  describe('release()', () => {
    it('marks the context as idle so it can be reused', async () => {
      const ctx = makeMockContext();
      mockFactory.createContext.mockResolvedValueOnce({ context: ctx, profile: {} });

      const acquired = await pool.acquire();
      pool.release(acquired);

      // Acquire again — factory should NOT be called a second time
      await pool.acquire();
      expect(mockFactory.createContext).toHaveBeenCalledTimes(1);
    });

    it('does nothing for an unknown context', () => {
      const unknown = makeMockContext();
      expect(() => pool.release(unknown)).not.toThrow();
    });
  });

  describe('destroy()', () => {
    it('removes the context from the pool and calls close()', async () => {
      const ctx = makeMockContext();
      mockFactory.createContext.mockResolvedValueOnce({ context: ctx, profile: {} });

      const acquired = await pool.acquire();
      await pool.destroy(acquired);

      expect(ctx.close).toHaveBeenCalledTimes(1);

      // Pool is empty — a new context must be created on next acquire
      mockFactory.createContext.mockResolvedValueOnce({ context: makeMockContext(), profile: {} });
      await pool.acquire();
      expect(mockFactory.createContext).toHaveBeenCalledTimes(2);
    });
  });

  describe('destroyAll()', () => {
    it('closes all pooled contexts', async () => {
      const contexts = [makeMockContext(), makeMockContext(), makeMockContext()];
      contexts.forEach((ctx) =>
        mockFactory.createContext.mockResolvedValueOnce({ context: ctx, profile: {} }),
      );

      await pool.acquire();
      await pool.acquire();
      await pool.acquire();
      await pool.destroyAll();

      contexts.forEach((ctx) => expect(ctx.close).toHaveBeenCalledTimes(1));
    });
  });

  describe('acquire/release cycle — 20 iterations', () => {
    it('does not grow the pool beyond the number of concurrent contexts needed', async () => {
      const ctx = makeMockContext();
      mockFactory.createContext.mockResolvedValue({ context: ctx, profile: {} });

      for (let i = 0; i < 20; i++) {
        const c = await pool.acquire();
        pool.release(c);
      }

      // Only 1 context ever created — the same one was reused 20 times
      expect(mockFactory.createContext).toHaveBeenCalledTimes(1);
    });
  });
});
