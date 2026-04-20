import { Controller, Get, Param, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SubtasksService } from './subtasks.service';
import { SseService } from '../sse/sse.service';

@Controller('subtasks')
export class SubtasksController {
  constructor(
    private readonly subtasks: SubtasksService,
    private readonly sse: SseService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subtasks.findOne(id);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Query('since_ts') sinceTs?: string) {
    return this.subtasks.getLogs(id, sinceTs);
  }

  @Sse(':id/stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.sse.subscribe(`subtask:${id}`);
  }
}
