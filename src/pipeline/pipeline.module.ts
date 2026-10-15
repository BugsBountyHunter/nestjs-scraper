import { Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { LinkedInProfileParser } from './parsers/linkedin-profile.parser';
import { LinkedInJobsParser } from './parsers/linkedin-jobs.parser';
import { LinkedInCompanyParser } from './parsers/linkedin-company.parser';
import { DataNormalizerService } from './normalizers/data-normalizer.service';

@Module({
  imports: [StorageModule],
  providers: [LinkedInProfileParser, LinkedInJobsParser, LinkedInCompanyParser, DataNormalizerService],
  exports: [StorageModule, LinkedInProfileParser, LinkedInJobsParser, LinkedInCompanyParser, DataNormalizerService],
})
export class PipelineModule {}
