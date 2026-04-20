import { Module } from '@nestjs/common';
import { SubtasksController } from './subtasks.controller';
import { SubtasksService } from './subtasks.service';
import { DbModule } from '../db/db.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [DbModule, SseModule],
  controllers: [SubtasksController],
  providers: [SubtasksService],
  exports: [SubtasksService],
})
export class SubtasksModule {}
