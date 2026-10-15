import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScrapeResult } from './scrape-result.entity';

export interface SaveResultInput {
  jobId?: string;
  target: string;
  url: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: ScrapeResult['status'];
}

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(ScrapeResult)
    private readonly repo: Repository<ScrapeResult>,
  ) {}

  async save(input: SaveResultInput): Promise<ScrapeResult> {
    const entity = this.repo.create({
      jobId: input.jobId ?? null,
      target: input.target,
      url: input.url,
      data: input.data,
      metadata: input.metadata ?? {},
      status: input.status ?? 'success',
    });
    return this.repo.save(entity);
  }
}
