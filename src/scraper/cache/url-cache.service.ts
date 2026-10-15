import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const CACHE_TTL_SECONDS = 24 * 60 * 60;
const KEY_PREFIX = 'url_cache:';

@Injectable()
export class UrlCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(UrlCacheService.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      this.logger.warn(`Redis error (URL cache): ${err.message}`);
    });
  }

  async isCached(url: string): Promise<boolean> {
    try {
      const val = await this.redis.get(`${KEY_PREFIX}${url}`);
      return val !== null;
    } catch {
      return false; // fail open — don't block scraping on Redis issues
    }
  }

  async markCached(url: string): Promise<void> {
    try {
      await this.redis.set(`${KEY_PREFIX}${url}`, '1', 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Failed to cache URL ${url}: ${(err as Error).message}`);
    }
  }

  async invalidate(url: string): Promise<void> {
    try {
      await this.redis.del(`${KEY_PREFIX}${url}`);
    } catch {
      // ignore
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
