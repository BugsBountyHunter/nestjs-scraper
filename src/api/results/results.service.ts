import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScrapeResult } from '../../pipeline/storage/scrape-result.entity';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(ScrapeResult)
    private readonly resultsRepo: Repository<ScrapeResult>,
  ) {}

  async findAll(limit = 20, offset = 0): Promise<{ data: ScrapeResult[]; total: number }> {
    const [data, total] = await this.resultsRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<ScrapeResult> {
    const result = await this.resultsRepo.findOneBy({ id });
    if (!result) {
      throw new NotFoundException(`Result ${id} not found`);
    }
    return result;
  }

  async findByJobId(jobId: string): Promise<ScrapeResult> {
    const result = await this.resultsRepo.findOneBy({ jobId });
    if (!result) {
      throw new NotFoundException(`No result for job ${jobId}`);
    }
    return result;
  }
}
