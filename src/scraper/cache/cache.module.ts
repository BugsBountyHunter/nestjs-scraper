import { Module } from '@nestjs/common';
import { UrlCacheService } from './url-cache.service';

@Module({
  providers: [UrlCacheService],
  exports: [UrlCacheService],
})
export class CacheModule {}
