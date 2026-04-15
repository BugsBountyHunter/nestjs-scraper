import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrchestratorProcessor } from './orchestrator.processor';
import { OrchestratorService } from './orchestrator.service';
import { BrowserModule } from '../browser/browser.module';
import { AntiDetectionModule } from '../anti-detection/anti-detection.module';
import { PipelineModule } from '../../pipeline/pipeline.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scraper' }),
    BrowserModule,
    AntiDetectionModule,
    PipelineModule,
  ],
  providers: [OrchestratorProcessor, OrchestratorService],
})
export class OrchestratorModule {}
