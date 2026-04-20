import { Injectable, Logger, OnApplicationBootstrap, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../db/db.module';
import { JobsService } from '../jobs/jobs.service';
import { SubtasksService } from '../subtasks/subtasks.service';
import { DecomposerService } from '../decomposer/decomposer.service';
import { RunnersService } from '../runners/runners.service';
import { SseService } from '../sse/sse.service';
import { AsyncQueue } from 'orchestration';
import type { Subtask } from '@prisma/client';

@Injectable()
export class OrchestratorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly queue: AsyncQueue<void>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => JobsService)) private readonly jobs: JobsService,
    private readonly subtasks: SubtasksService,
    private readonly decomposer: DecomposerService,
    private readonly runners: RunnersService,
    private readonly sse: SseService,
  ) {
    const maxParallel = Number(this.config.get('MAX_PARALLEL_RUNNERS', '3'));
    this.queue = new AsyncQueue<void>(maxParallel);
  }

  async onApplicationBootstrap() {
    const stale = await this.prisma.subtask.findMany({ where: { status: 'RUNNING' } });
    for (const s of stale) {
      this.logger.warn(`Marking stale subtask ${s.id} as FAILED (orchestrator restart)`);
      await this.subtasks.updateStatus(s.id, 'FAILED', { error: 'Orchestrator restarted while task was running' }).catch(() => void 0);
    }
    const queued = await this.prisma.subtask.findMany({ where: { status: 'QUEUED' } });
    for (const s of queued) {
      this.enqueue(s);
    }
    this.logger.log(`Orchestrator ready. Rehydrated ${queued.length} queued subtask(s).`);
  }

  async submitJob(jobId: string): Promise<void> {
    const job = await this.jobs.findOne(jobId);
    const repoPath = this.config.get('REPO_PATH', '/workspace');

    await this.jobs.updateStatus(jobId, 'DECOMPOSING');
    this.sse.emit(`job:${jobId}`, { type: 'status', status: 'DECOMPOSING' });

    let subtaskRows: Subtask[];
    try {
      const repoContext = await this.decomposer.getRepoContext(repoPath);
      const decomposed = await this.decomposer.decompose(job.prompt, repoContext);

      subtaskRows = await this.subtasks.createMany(
        jobId,
        decomposed.subtasks.map((s) => ({
          order: s.order,
          title: s.title,
          spec: s.spec,
          acceptanceCriteria: s.acceptanceCriteria,
        })),
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Decomposition failed for job ${jobId}`, error);
      await this.jobs.updateStatus(jobId, 'FAILED', error);
      this.sse.emit(`job:${jobId}`, { type: 'status', status: 'FAILED', error });
      return;
    }

    await this.jobs.updateStatus(jobId, 'RUNNING');
    this.sse.emit(`job:${jobId}`, { type: 'status', status: 'RUNNING', subtaskCount: subtaskRows.length });

    for (const subtask of subtaskRows) {
      this.enqueue(subtask);
    }
  }

  private enqueue(subtask: Subtask): void {
    this.queue.add(async () => {
      await this.runners.runSubtask(subtask);
      await this.finalizeJobIfDone(subtask.jobId);
    }).catch((err) => {
      this.logger.error(`Queue error for subtask ${subtask.id}`, err);
    });
  }

  private async finalizeJobIfDone(jobId: string): Promise<void> {
    const all = await this.subtasks.findByJob(jobId);
    const terminal = all.filter((s) => s.status === 'PR_CREATED' || s.status === 'FAILED');
    if (terminal.length < all.length) return;

    const allSuccess = all.every((s) => s.status === 'PR_CREATED');
    const anySuccess = all.some((s) => s.status === 'PR_CREATED');

    const finalStatus = allSuccess ? 'COMPLETED' : anySuccess ? 'PARTIALLY_COMPLETED' : 'FAILED';
    await this.jobs.updateStatus(jobId, finalStatus).catch(() => void 0);
    this.sse.emit(`job:${jobId}`, { type: 'status', status: finalStatus });
  }
}
