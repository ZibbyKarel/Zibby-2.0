import { Module, forwardRef } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { DbModule } from '../db/db.module';
import { JobsModule } from '../jobs/jobs.module';
import { SubtasksModule } from '../subtasks/subtasks.module';
import { DecomposerModule } from '../decomposer/decomposer.module';
import { RunnersModule } from '../runners/runners.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [DbModule, forwardRef(() => JobsModule), SubtasksModule, DecomposerModule, RunnersModule, SseModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
