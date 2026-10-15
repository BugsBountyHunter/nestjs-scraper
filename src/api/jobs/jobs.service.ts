import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, JobType } from 'bullmq';
import { CreateJobDto, JobPriority } from './dto/create-job.dto';
import { JobResponseDto, JobStatus } from './dto/job-response.dto';

const PRIORITY_MAP: Record<JobPriority, number> = {
  high: 1,
  normal: 5,
  low: 10,
};

const SCRAPER_QUEUE = 'scraper';

@Injectable()
export class JobsService {
  private readonly attempts: number;
  private readonly backoffDelayMs: number;

  constructor(
    @InjectQueue(SCRAPER_QUEUE) private readonly scraperQueue: Queue,
    config: ConfigService,
  ) {
    // Each BullMQ attempt already retries up to 3× internally with a fresh
    // browser context, so keep queue-level attempts low.
    this.attempts = Number(config.get('SCRAPER_JOB_ATTEMPTS', 2));
    this.backoffDelayMs = Number(config.get('SCRAPER_BACKOFF_DELAY', 5000));
  }

  async enqueue(createJobDto: CreateJobDto): Promise<JobResponseDto> {
    const priority = PRIORITY_MAP[createJobDto.priority ?? 'normal'];

    const job = await this.scraperQueue.add(
      createJobDto.target,
      {
        url: createJobDto.url,
        target: createJobDto.target,
        metadata: createJobDto.metadata ?? {},
      },
      {
        priority,
        attempts: this.attempts,
        backoff: { type: 'exponential', delay: this.backoffDelayMs },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return this.toDto(job);
  }

  async getStatus(jobId: string): Promise<JobResponseDto> {
    const job = await this.scraperQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return this.toDto(job);
  }

  async listJobs(limit = 20, offset = 0): Promise<JobResponseDto[]> {
    const states: JobType[] = ['waiting', 'active', 'completed', 'failed', 'delayed'];
    const jobs = await this.scraperQueue.getJobs(states, offset, offset + limit - 1);
    return jobs.map((job) => this.toDto(job));
  }

  private toDto(job: Job): JobResponseDto {
    const status = this.resolveStatus(job);
    return {
      jobId: job.id as string,
      status,
      progress: typeof job.progress === 'number' ? job.progress : undefined,
      result: job.returnvalue ?? undefined,
      failedReason: job.failedReason ?? undefined,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
    };
  }

  private resolveStatus(job: Job): JobStatus {
    if (job.finishedOn && !job.failedReason) return JobStatus.COMPLETED;
    if (job.failedReason) return JobStatus.FAILED;
    if (job.processedOn) return JobStatus.ACTIVE;
    if (job.delay) return JobStatus.DELAYED;
    return JobStatus.PENDING;
  }
}
