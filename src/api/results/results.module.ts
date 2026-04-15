import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { ScrapeResult } from '../../pipeline/storage/scrape-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeResult])],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
