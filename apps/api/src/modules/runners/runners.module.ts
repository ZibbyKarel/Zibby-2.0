import { Module } from '@nestjs/common';
import { RunnersService } from './runners.service';
import { SubtasksModule } from '../subtasks/subtasks.module';
import { GitHubModule } from '../github/github.module';
import { SseModule } from '../sse/sse.module';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule, SubtasksModule, GitHubModule, SseModule],
  providers: [RunnersService],
  exports: [RunnersService],
})
export class RunnersModule {}
