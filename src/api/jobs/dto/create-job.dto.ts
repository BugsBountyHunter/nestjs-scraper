import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScraperTarget {
  LINKEDIN_PROFILE = 'linkedin_profile',
  LINKEDIN_JOBS = 'linkedin_jobs',
  LINKEDIN_COMPANY = 'linkedin_company',
}

export class CreateJobDto {
  @ApiProperty({ enum: ScraperTarget, example: ScraperTarget.LINKEDIN_PROFILE })
  @IsEnum(ScraperTarget)
  target: ScraperTarget;

  @ApiProperty({ example: 'https://www.linkedin.com/in/username/' })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: 'high', description: 'Job priority: low | normal | high' })
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high';

  @ApiPropertyOptional({ description: 'Additional metadata to attach to the job' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
