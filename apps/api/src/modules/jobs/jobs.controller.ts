import { Controller, Post, Get, Param, Body, Query, Sse, ParseIntPipe, DefaultValuePipe, MessageEvent, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JobsService } from './jobs.service';
import { SseService } from '../sse/sse.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { CreateJobSchema } from 'shared-types';

@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly sse: SseService,
    @Inject(forwardRef(() => OrchestratorService)) private readonly orchestrator: OrchestratorService,
  ) {}

  @Post()
  async create(@Body() body: unknown) {
    const result = CreateJobSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    const job = await this.jobs.createJob(result.data.prompt);
    // Fire-and-forget; orchestrator runs async
    this.orchestrator.submitJob(job.id).catch((err) =>
      this.logger.error('submitJob failed', err),
    );
    return job;
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
