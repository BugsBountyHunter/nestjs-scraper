import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'scraper' })],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
