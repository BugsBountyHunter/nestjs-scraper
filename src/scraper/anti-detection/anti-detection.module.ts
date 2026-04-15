import { Module } from '@nestjs/common';
import { FingerprintService } from './fingerprint/fingerprint.service';
import { HumanSimulatorService } from './human-simulator/human-simulator.service';
import { CaptchaService } from './captcha/captcha.service';

@Module({
  providers: [FingerprintService, HumanSimulatorService, CaptchaService],
  exports: [FingerprintService, HumanSimulatorService, CaptchaService],
})
export class AntiDetectionModule {}
