import { Module } from '@nestjs/common';
import { JobsModule } from './jobs/jobs.module';
import { ResultsModule } from './results/results.module';

@Module({
  imports: [JobsModule, ResultsModule],
})
export class ApiModule {}
