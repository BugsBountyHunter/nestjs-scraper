import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { ResultsService } from './results.service';
import { ScrapeResult } from '../../pipeline/storage/scrape-result.entity';

@ApiTags('results')
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  @ApiOperation({ summary: 'List all scraped results' })
  @ApiOkResponse({ description: 'Paginated list of results' })
  findAll(@Query() { limit, offset }: PaginationQueryDto): Promise<{ data: ScrapeResult[]; total: number }> {
    return this.resultsService.findAll(limit, offset);
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get result by job ID' })
  @ApiParam({ name: 'jobId', description: 'BullMQ Job ID' })
  findByJobId(@Param('jobId') jobId: string): Promise<ScrapeResult> {
    return this.resultsService.findByJobId(jobId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a result by its record ID' })
  @ApiParam({ name: 'id', description: 'Result UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScrapeResult> {
    return this.resultsService.findOne(id);
  }
}
