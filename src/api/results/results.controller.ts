import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { ScrapeResult } from '../../pipeline/storage/scrape-result.entity';

@ApiTags('results')
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  @ApiOperation({ summary: 'List all scraped results' })
  @ApiOkResponse({ description: 'Paginated list of results' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<{ data: ScrapeResult[]; total: number }> {
    return this.resultsService.findAll(+limit, +offset);
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
  findOne(@Param('id') id: string): Promise<ScrapeResult> {
    return this.resultsService.findOne(id);
  }
}
