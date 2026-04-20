import { Module } from '@nestjs/common';
import { RunnersService } from './runners.service';
import { SubtasksModule } from '../subtasks/subtasks.module';
import { GitHubModule } from '../github/github.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [SubtasksModule, GitHubModule, SseModule],
  providers: [RunnersService],
  exports: [RunnersService],
})
export class RunnersModule {}
