import { Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { LinkedInProfileParser } from './parsers/linkedin-profile.parser';
import { LinkedInJobsParser } from './parsers/linkedin-jobs.parser';
import { DataNormalizerService } from './normalizers/data-normalizer.service';

@Module({
  imports: [StorageModule],
  providers: [LinkedInProfileParser, LinkedInJobsParser, DataNormalizerService],
  exports: [StorageModule, LinkedInProfileParser, LinkedInJobsParser, DataNormalizerService],
})
export class PipelineModule {}
