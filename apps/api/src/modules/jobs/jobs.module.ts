import { Module, forwardRef } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { DbModule } from '../db/db.module';
import { SseModule } from '../sse/sse.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [DbModule, SseModule, forwardRef(() => OrchestratorModule)],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
