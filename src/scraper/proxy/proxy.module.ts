import { Module } from '@nestjs/common';
import { ProxyRotatorService } from './proxy-rotator.service';

@Module({
  providers: [ProxyRotatorService],
  exports: [ProxyRotatorService],
})
export class ProxyModule {}
