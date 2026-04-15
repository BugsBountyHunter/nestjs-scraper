import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum JobStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
}

export class JobResponseDto {
  @ApiProperty({ example: '1' })
  jobId: string;

  @ApiProperty({ enum: JobStatus })
  status: JobStatus;

  @ApiPropertyOptional()
  progress?: number;

  @ApiPropertyOptional()
  result?: unknown;

  @ApiPropertyOptional()
  failedReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  processedAt?: Date;
}
