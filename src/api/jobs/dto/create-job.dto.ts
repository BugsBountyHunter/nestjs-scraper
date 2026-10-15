import { IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, ValidateBy } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { isAllowedTargetUrl } from '../../../scraper/security/url-policy';

export enum ScraperTarget {
  LINKEDIN_PROFILE = 'linkedin_profile',
  LINKEDIN_JOBS = 'linkedin_jobs',
  LINKEDIN_COMPANY = 'linkedin_company',
}

export const JOB_PRIORITIES = ['low', 'normal', 'high'] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

// The worker drives a real browser to this URL, so only https LinkedIn on the
// default port is accepted (SSRF). Redirects are enforced separately by the
// navigation guard — see scraper/security/navigation-guard.ts.
const IsAllowedTargetUrl = (): PropertyDecorator =>
  ValidateBy({
    name: 'isAllowedTargetUrl',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && isAllowedTargetUrl(value),
      defaultMessage: () => 'url must be an https://linkedin.com URL on the default port',
    },
  });

export class CreateJobDto {
  @ApiProperty({ enum: ScraperTarget, example: ScraperTarget.LINKEDIN_PROFILE })
  @IsEnum(ScraperTarget)
  target: ScraperTarget;

  @ApiProperty({ example: 'https://www.linkedin.com/in/username/' })
  @IsString()
  @IsNotEmpty()
  @IsAllowedTargetUrl()
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
