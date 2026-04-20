import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './modules/db/db.module';
import { SseModule } from './modules/sse/sse.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { SubtasksModule } from './modules/subtasks/subtasks.module';
import { DecomposerModule } from './modules/decomposer/decomposer.module';
import { GitHubModule } from './modules/github/github.module';
import { RunnersModule } from './modules/runners/runners.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    SseModule,
    JobsModule,
    SubtasksModule,
    DecomposerModule,
    GitHubModule,
    RunnersModule,
    OrchestratorModule,
  ],
})
export class AppModule {}
