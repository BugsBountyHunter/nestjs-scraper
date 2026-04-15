import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapeResult } from './scrape-result.entity';
import { StorageService } from './storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeResult])],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
