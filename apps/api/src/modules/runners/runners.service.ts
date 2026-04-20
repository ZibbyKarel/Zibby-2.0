import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubtasksService } from '../subtasks/subtasks.service';
import { GitHubService } from '../github/github.service';
import { SseService } from '../sse/sse.service';
import { addWorktree, removeWorktree, buildSubtaskPrompt, runSubtask } from 'runner';
import type { Subtask } from '@prisma/client';
import * as path from 'path';

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
  ) {}

  async runSubtask(subtask: Subtask): Promise<void> {
    const repoPath = this.config.get('REPO_PATH', '/workspace');
    const baseBranch = this.config.get('BASE_BRANCH', 'main');
    const maxTurns = Number(this.config.get('MAX_TURNS', '300'));
    const model = this.config.get('CLAUDE_MODEL', 'claude-sonnet-4-6');

    const branch = `task/${subtask.id}`;
    const worktreePath = path.join(repoPath, '.worktrees', subtask.id);

    await this.subtasks.updateStatus(subtask.id, 'RUNNING', { branch });
    this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'RUNNING' });
    this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'RUNNING' });

    let logBuffer: Array<{ stream: string; line: string }> = [];
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    const flushLogs = async () => {
      if (logBuffer.length === 0) return;
      const batch = logBuffer.splice(0, logBuffer.length);
      for (const entry of batch) {
        await this.subtasks.appendLog(subtask.id, entry.stream, entry.line);
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
      await addWorktree(repoPath, worktreePath, branch);

      const prompt = buildSubtaskPrompt({
        title: subtask.title,
        spec: subtask.spec,
        acceptanceCriteria: subtask.acceptanceCriteria,
      });

      let success = false;

      for await (const event of runSubtask({ worktreePath, prompt, config: { repoPath, maxTurns, model, baseBranch } })) {
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
        await this.subtasks.updateStatus(subtask.id, 'PUSHING', { branch });
        this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'PUSHING' });

        await this.github.pushBranch(worktreePath, branch);

        const prBody = `## ${subtask.title}\n\n${subtask.spec}\n\n### Acceptance Criteria\n${
          (JSON.parse(subtask.acceptanceCriteria) as string[]).map((c, i) => `${i + 1}. ${c}`).join('\n')
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
}
