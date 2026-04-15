import { Module } from '@nestjs/common';
import { BrowserFactoryService } from './browser-factory.service';
import { BrowserPoolService } from './browser-pool.service';
import { AntiDetectionModule } from '../anti-detection/anti-detection.module';
import { ProxyModule } from '../proxy/proxy.module';

@Module({
  imports: [AntiDetectionModule, ProxyModule],
  providers: [BrowserFactoryService, BrowserPoolService],
  exports: [BrowserPoolService],
})
export class BrowserModule {}
