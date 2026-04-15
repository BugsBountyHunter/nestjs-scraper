import { Injectable } from '@nestjs/common';
import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';

@Injectable()
export class DataNormalizerService {
  normalize(target: string, raw: Record<string, unknown>): Record<string, unknown> {
    const base = {
      ...raw,
      _target: target,
      _normalizedAt: new Date().toISOString(),
    };

    switch (target) {
      case ScraperTarget.LINKEDIN_PROFILE:
        return this.normalizeProfile(base);
      case ScraperTarget.LINKEDIN_JOBS:
        return this.normalizeJobs(base);
      default:
        return base;
    }
  }

  private normalizeProfile(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      name: this.cleanString(data.name as string),
      headline: this.cleanString(data.headline as string),
      location: this.cleanString(data.location as string),
    };
  }

  private normalizeJobs(data: Record<string, unknown>): Record<string, unknown> {
    const jobs = (data.jobs as Array<Record<string, unknown>>) ?? [];
    return {
      ...data,
      jobs: jobs.map((job) => ({
        ...job,
        title: this.cleanString(job.title as string),
        company: this.cleanString(job.company as string),
        location: this.cleanString(job.location as string),
      })),
    };
  }

  private cleanString(value: string | null | undefined): string | null {
    if (!value) return null;
    return value.replace(/\s+/g, ' ').trim();
  }
}
