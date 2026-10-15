import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobResponseDto } from './dto/job-response.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a new scraping job' })
  @ApiCreatedResponse({ type: JobResponseDto })
  enqueue(@Body() createJobDto: CreateJobDto): Promise<JobResponseDto> {
    return this.jobsService.enqueue(createJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all scraping jobs' })
  @ApiOkResponse({ type: [JobResponseDto] })
  list(@Query() { limit, offset }: PaginationQueryDto): Promise<JobResponseDto[]> {
    return this.jobsService.listJobs(limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job status by ID' })
  @ApiOkResponse({ type: JobResponseDto })
  @ApiParam({ name: 'id', description: 'Job ID' })
  getStatus(@Param('id') id: string): Promise<JobResponseDto> {
    return this.jobsService.getStatus(id);
  }
}
