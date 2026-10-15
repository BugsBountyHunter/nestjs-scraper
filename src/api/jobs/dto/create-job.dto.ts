import { IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScraperTarget {
  LINKEDIN_PROFILE = 'linkedin_profile',
  LINKEDIN_JOBS = 'linkedin_jobs',
  LINKEDIN_COMPANY = 'linkedin_company',
}

export const JOB_PRIORITIES = ['low', 'normal', 'high'] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

// Only LinkedIn hosts are accepted — the worker drives a real browser to this
// URL, so an open allow-list would let callers reach internal services (SSRF).
const ALLOWED_HOSTS = [/^(www\.)?linkedin\.com$/, /^[a-z]{2}\.linkedin\.com$/];

export class CreateJobDto {
  @ApiProperty({ enum: ScraperTarget, example: ScraperTarget.LINKEDIN_PROFILE })
  @IsEnum(ScraperTarget)
  target: ScraperTarget;

  @ApiProperty({ example: 'https://www.linkedin.com/in/username/' })
  @IsUrl(
    { protocols: ['https'], require_protocol: true, host_whitelist: ALLOWED_HOSTS },
    { message: 'url must be an https://linkedin.com URL' },
  )
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ enum: JOB_PRIORITIES, example: 'high' })
  @IsOptional()
  @IsIn(JOB_PRIORITIES)
  priority?: JobPriority;

  @ApiPropertyOptional({ description: 'Additional metadata to attach to the job' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
