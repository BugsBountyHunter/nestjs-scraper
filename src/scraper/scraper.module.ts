import { Module } from '@nestjs/common';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { BrowserModule } from './browser/browser.module';
import { AntiDetectionModule } from './anti-detection/anti-detection.module';
import { ProxyModule } from './proxy/proxy.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    AntiDetectionModule,
    ProxyModule,
    SessionModule,
    BrowserModule,
    OrchestratorModule,
  ],
})
export class ScraperModule {}
