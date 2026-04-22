import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubtasksService } from '../subtasks/subtasks.service';
import { GitHubService } from '../github/github.service';
import { SseService } from '../sse/sse.service';
import { PrismaService } from '../db/db.module';
import { addWorktree, removeWorktree, buildSubtaskPrompt, runSubtask } from 'runner';
import type { Subtask } from '@prisma/client';
import * as path from 'path';
import { stat } from 'fs/promises';
import { resolveJobPaths } from '../jobs/job-path-resolver';

const LOG_BATCH_SIZE = 50;
const LOG_FLUSH_INTERVAL_MS = 500;

@Injectable()
export class RunnersService {
  private readonly logger = new Logger(RunnersService.name);

  constructor(
    private readonly subtasks: SubtasksService,
    private readonly github: GitHubService,
    private readonly sse: SseService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async runSubtask(subtask: Subtask): Promise<void> {
    const defaultRepoPath = this.config.get('REPO_PATH', '/workspace');
    const baseBranch = this.config.get('BASE_BRANCH', 'main');
    const maxTurns = Number(this.config.get('MAX_TURNS', '300'));
    const model = this.config.get('CLAUDE_MODEL', 'claude-sonnet-4-6');
    const branch = `task/${subtask.id}`;
    let repoPath = defaultRepoPath;
    let worktreePath = path.join(repoPath, '.worktrees', subtask.id);

    let logBuffer: Array<{ stream: string; line: string }> = [];
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let isFlushing = false;

    const flushLogs = async () => {
      if (isFlushing || logBuffer.length === 0) return;
      isFlushing = true;
      const batch = logBuffer.splice(0, logBuffer.length);
      try {
        for (const entry of batch) {
          await this.subtasks.appendLog(subtask.id, entry.stream, entry.line);
        }
      } finally {
        isFlushing = false;
      }
    };

    const queueLog = (stream: string, line: string) => {
      logBuffer.push({ stream, line });
      this.sse.emit(`subtask:${subtask.id}`, { type: 'log', stream, line });
      if (logBuffer.length >= LOG_BATCH_SIZE) {
        flushLogs().catch((err) => this.logger.error('Log flush error', err));
      }
    };

    flushTimer = setInterval(() => {
      flushLogs().catch((err) => this.logger.error('Log flush timer error', err));
    }, LOG_FLUSH_INTERVAL_MS);

    try {
      const job = await this.prisma.job.findUnique({
        where: { id: subtask.jobId },
        select: { directory: true },
      });
      if (!job) {
        throw new Error(`Job ${subtask.jobId} not found for subtask ${subtask.id}`);
      }
      const resolvedPaths = await resolveJobPaths(defaultRepoPath, job.directory);
      repoPath = resolvedPaths.repoPath;
      worktreePath = path.join(repoPath, '.worktrees', subtask.id);

      await this.subtasks.updateStatus(subtask.id, 'RUNNING', { branch });
      this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'RUNNING' });
      this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'RUNNING' });

      await addWorktree(repoPath, worktreePath, branch, baseBranch);
      const executionPath = await this.resolveExecutionPath(worktreePath, resolvedPaths.executionSubpath);

      const prompt = buildSubtaskPrompt({
        title: subtask.title,
        spec: subtask.spec,
        acceptanceCriteria: subtask.acceptanceCriteria,
      });

      let success = false;

      for await (const event of runSubtask({ worktreePath: executionPath, prompt, config: { repoPath, maxTurns, model, baseBranch } })) {
        if (event.type === 'log') {
          queueLog(event.stream, event.line);
        } else if (event.type === 'system') {
          queueLog('SYSTEM', event.message);
        } else if (event.type === 'result_success') {
          success = true;
          queueLog('SYSTEM', `Claude exited successfully: ${event.summary}`);
        } else if (event.type === 'result_error') {
          queueLog('SYSTEM', `Claude exited with error: ${event.error}`);
        }
      }

      await flushLogs();

      if (success) {
        // Parse acceptance criteria before we push — fail early rather than after push
        let criteria: string[];
        try {
          criteria = JSON.parse(subtask.acceptanceCriteria) as string[];
        } catch {
          throw new Error(`Invalid acceptanceCriteria JSON for subtask ${subtask.id}`);
        }

        await this.subtasks.updateStatus(subtask.id, 'PUSHING', { branch });
        this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'PUSHING' });

        await this.github.pushBranch(worktreePath, branch);

        const prBody = `## ${subtask.title}\n\n${subtask.spec}\n\n### Acceptance Criteria\n${
          criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
        }`;
        const prUrl = await this.github.createPr({
          worktreePath,
          baseBranch,
          branch,
          title: subtask.title,
          body: prBody,
        });

        await this.subtasks.updateStatus(subtask.id, 'PR_CREATED', { prUrl });
        this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'PR_CREATED', prUrl });
        this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'PR_CREATED', prUrl });
      } else {
        await this.subtasks.updateStatus(subtask.id, 'FAILED', { error: 'Claude did not complete the task successfully' });
        this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'FAILED' });
        this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'FAILED' });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Subtask ${subtask.id} failed with exception`, error);
      await flushLogs();
      await this.subtasks.updateStatus(subtask.id, 'FAILED', { error }).catch(() => void 0);
      this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'FAILED', error });
      this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'FAILED' });
    } finally {
      if (flushTimer) clearInterval(flushTimer);
      await removeWorktree(repoPath, worktreePath).catch(() => void 0);
    }
  }

  private async resolveExecutionPath(worktreePath: string, executionSubpath: string): Promise<string> {
    const executionPath = path.resolve(worktreePath, executionSubpath);
    const relativePath = path.relative(worktreePath, executionPath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Invalid execution directory: ${executionSubpath}`);
    }

    const info = await stat(executionPath).catch(() => null);
    if (!info?.isDirectory()) {
      throw new Error(`Execution directory does not exist in worktree: ${executionSubpath}`);
    }

    return executionPath;
  }
}
