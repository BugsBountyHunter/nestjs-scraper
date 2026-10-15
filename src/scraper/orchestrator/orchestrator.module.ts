import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrchestratorProcessor } from './orchestrator.processor';
import { OrchestratorService } from './orchestrator.service';
import { BrowserModule } from '../browser/browser.module';
import { AntiDetectionModule } from '../anti-detection/anti-detection.module';
import { ProxyModule } from '../proxy/proxy.module';
import { PipelineModule } from '../../pipeline/pipeline.module';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { CacheModule } from '../cache/cache.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scraper',
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: false, // keep failed jobs as dead letter queue
      },
    }),
    BrowserModule,
    AntiDetectionModule,
    ProxyModule,
    PipelineModule,
    CircuitBreakerModule,
    CacheModule,
    SessionModule,
  ],
  providers: [OrchestratorProcessor, OrchestratorService],
})
export class OrchestratorModule {}
