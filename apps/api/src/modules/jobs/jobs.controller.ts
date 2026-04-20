import { Controller, Post, Get, Param, Body, Query, Sse, ParseIntPipe, DefaultValuePipe, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JobsService } from './jobs.service';
import { SseService } from '../sse/sse.service';
import { CreateJobSchema } from 'shared-types';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly sse: SseService,
  ) {}

  @Post()
  async create(@Body() body: unknown) {
    const { prompt } = CreateJobSchema.parse(body);
    return this.jobs.createJob(prompt);
  }

  @Get()
  findAll(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.jobs.findAll(limit, offset);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobs.findOne(id);
  }

  @Sse(':id/stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.sse.subscribe(`job:${id}`);
  }
}
