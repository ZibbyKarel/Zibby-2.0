import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { Story, StoryStatus, ThinkingLevel } from '@nightcoder/shared-types/ipc';
import { runClaudeInWorktree } from '@nightcoder/claude-runner';
import { commitAllIfDirty, gitPush, ghCreatePr, ghFindPrForBranch } from '@nightcoder/github';
import {
  appendJournalLine,
  ensureTaskDir,
  journalPath,
  listTaskFiles,
  taskFilesDir,
  writePlanMd,
} from '@nightcoder/project-state';
import { attachWorktree, createWorktree, type WorktreeHandle } from './worktree';
import { slugify, uniqueSlug } from './slug';
import { tryClaimStory } from './active-stories';
import { installPostCommitHook } from './post-commit-hook';
import { resolveConflicts, type ConflictResolverEvent } from './conflict-resolver';
import { startAutoMerge, type AutoMergeEvent, type AutoMergeHandle } from './auto-merge';

const execFileP = promisify(execFile);
const POLL_INTERVAL_MS = 2000;
const PLAN_BLOCK_RE = /<plan>([\s\S]*?)<\/plan>/i;

export type StoryExecutionEvent =
  | { kind: 'status'; status: StoryStatus }
  | { kind: 'log'; stream: 'stdout' | 'stderr' | 'info'; line: string }
  | { kind: 'branch'; branch: string }
  | { kind: 'pr'; url: string; branch: string }
  | { kind: 'limit-hit'; resetsAt: number | null }
  | { kind: 'conflict'; conflictedFiles: string[]; attempt: number; resolved: boolean }
  | { kind: 'auto-merge'; state: 'polling' | 'rebasing' | 'merged' | 'failed'; message?: string };

export type StoryExecutionResult = {
  success: boolean;
  prUrl?: string;
  branch?: string;
  error?: string;
  duplicate?: boolean;
  /** Set when the run was paused because a Claude usage limit was hit. */
  limitHit?: boolean;
  limitResetsAt?: number | null;
};

/** Build a continuation prompt for resume: fresh story context + prior plan + journal tail. */
export function buildResumePrompt(args: {
  story: Story;
  plan: string | null;
  journalTail: string;
  attachedFileNames?: readonly string[];
}): string {
  const { story, plan, journalTail, attachedFileNames = [] } = args;
  const parts: string[] = [];
  parts.push(`Continue implementing this user story. A previous session made progress and was interrupted.`);
  parts.push(`# ${story.title}\n\n${story.description}`);
  if (story.acceptanceCriteria.length > 0) {
    parts.push(`## Acceptance criteria\n\n${story.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`);
  }
  if (attachedFileNames.length > 0) {
    parts.push(
      `## Attached context files\n\nThese files were attached to the task (available via --add-dir): ${attachedFileNames.join(', ')}. Re-read them if relevant.`,
    );
  }
  if (plan && plan.trim().length > 0) {
    parts.push(`## Your earlier plan (plan.md)\n\n${plan.trim()}`);
  }
  if (journalTail.trim().length > 0) {
    parts.push(
      `## Commits made so far (journal tail, oldest first)\n\n\`\`\`\n${journalTail.trim()}\n\`\`\`\n\n` +
        `Inspect the worktree's current state (\`git log\`, file contents) and resume from where the journal ends. Do not redo work that is already committed.`,
    );
  } else {
    parts.push(`No commits have been journaled yet. Inspect the worktree's current state and continue.`);
  }
  parts.push(
    `Process guidelines:\n` +
      `- After each additional logical subtask, run \`git add -A && git commit -m "<concise subject>"\` so the journal continues to grow.\n` +
      `- Keep existing tests/lint/typecheck green.\n` +
      `- When every acceptance criterion is met, make a final commit and stop — the outer tool will push and open a PR.`,
  );
  return parts.join('\n\n');
}

/**
 * Model alias used for the single claude run. `phaseModels.implementation`
 * wins if set (new config path from the AddTask dialog); falls back to the
 * legacy flat `story.model`; finally to the runner's default.
 */
export function implementationModelFor(story: Story): string | undefined {
  return story.phaseModels?.implementation?.model ?? story.model;
}

/**
 * Thinking level used for the single claude run. Only the Implementation
 * phase applies today; Planning/QA are persisted but not yet executed. See
 * `thinkingPreamble()` for how this is surfaced to claude.
 */
export function implementationThinkingFor(story: Story): ThinkingLevel | undefined {
  return story.phaseModels?.implementation?.thinking;
}

/**
 * Translate a thinking level into a short prompt preamble. The claude CLI has
 * no native "thinking level" flag today, so we piggy-back on the prompt. 'off'
 * and undefined both emit no preamble.
 */
export function thinkingPreamble(level: ThinkingLevel | undefined): string {
  switch (level) {
    case 'low':
      return 'Think briefly before acting.';
    case 'medium':
      return 'Think carefully before acting. Break the problem into steps.';
    case 'high':
      return 'Think very carefully before acting. Reason step by step, consider edge cases, and double-check your plan before writing code.';
    default:
      return '';
  }
}

function buildPrompt(story: Story, attachedFileNames: readonly string[] = []): string {
  const ac = story.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const files = story.affectedFiles.length > 0 ? `\n\nExpected files to touch: ${story.affectedFiles.join(', ')}` : '';
  const attached = attachedFileNames.length > 0
    ? `\n\nAttached context files (available via --add-dir): ${attachedFileNames.join(', ')}. Read them before planning.`
    : '';
  const thinking = thinkingPreamble(implementationThinkingFor(story));
  const preamble = thinking.length > 0 ? `${thinking}\n\n` : '';
  return `${preamble}Implement the following user story end-to-end in this repository.

# ${story.title}

${story.description}

## Acceptance criteria

${ac}${files}${attached}

Process guidelines:
- Before coding, output your implementation plan inside a <plan>...</plan> markdown block near the top of your response. Break the work into small subtasks so each one can be a commit.
- You are working inside a git worktree on a fresh feature branch. After each logical subtask, run \`git add -A && git commit -m "<concise subject>"\` — each commit is journaled as a subtask boundary.
- Run existing test/lint/typecheck commands if present and keep them green.
- Respect the repository's own CLAUDE.md / AGENTS.md and other AI convention files.
- When every acceptance criterion is met and tests pass, make a final commit and stop — the outer tool will push and open a PR.`;
}

function buildPrBody(story: Story): string {
  const ac = story.acceptanceCriteria.map((c) => `- [ ] ${c}`).join('\n');
  return `## Summary

${story.description}

## Acceptance criteria

${ac}

---

🤖 Auto-generated by NightCoder.`;
}

function extractPlanBlock(text: string): string | null {
  const m = PLAN_BLOCK_RE.exec(text);
  if (!m) return null;
  const trimmed = m[1].trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Degraded-mode journal populator. When we can't install our post-commit hook
 * (a foreign hook is already there), poll `git log` on the worktree branch
 * every 2s and append new commits to the task journal.
 */
function startCommitPoller(args: {
  repoPath: string;
  worktreePath: string;
  branch: string;
  baseBranch: string;
  taskId: string;
  onInfo: (msg: string) => void;
}): () => Promise<void> {
  const seen = new Set<string>();
  let stopped = false;
  let inFlight: Promise<void> | null = null;

  const poll = async () => {
    if (stopped) return;
    try {
      const { stdout } = await execFileP(
        'git',
        ['log', '--format=%H%x1f%at%x1f%s', `${args.baseBranch}..HEAD`],
        { cwd: args.worktreePath },
      );
      const lines = stdout.split('\n').filter((l) => l.trim().length > 0).reverse();
      for (const line of lines) {
        const [hash, tsStr, ...subjectParts] = line.split('\x1f');
        if (!hash || seen.has(hash)) continue;
        seen.add(hash);
        const timestamp = Number.isFinite(Number(tsStr)) ? Number(tsStr) : Math.floor(Date.now() / 1000);
        const subject = subjectParts.join('\x1f');
        await appendJournalLine(args.repoPath, args.taskId, { timestamp, hash, subject });
      }
    } catch {
      // transient (base branch missing in worktree, race with git) — ignore and retry.
    }
  };

  const interval = setInterval(() => {
    if (inFlight) return;
    inFlight = poll().finally(() => { inFlight = null; });
  }, POLL_INTERVAL_MS);

  args.onInfo(`commit journal: polling ${args.baseBranch}..HEAD every ${POLL_INTERVAL_MS}ms (foreign post-commit hook detected)`);

  return async () => {
    stopped = true;
    clearInterval(interval);
    if (inFlight) {
      try { await inFlight; } catch { /* ignore */ }
    }
    await poll().catch(() => {});
  };
}

export type ResumeContext = {
  /** Branch to attach (or recreate a worktree for). Shaped like `nightcoder/<slug>`. */
  branch: string;
  /** Full prompt body — callers should build this via `buildResumePrompt()`. */
  prompt: string;
  /**
   * When true, skip claude entirely and go straight to push+PR. Used when the
   * task was interrupted in the `pushing` status — claude already finished.
   */
  pushOnly?: boolean;
};

export async function executeStory(args: {
  story: Story;
  storyIndex: number;
  repoPath: string;
  baseBranch: string;
  usedSlugs: Set<string>;
  onEvent: (event: StoryExecutionEvent) => void;
  signal: { cancelled: boolean };
  /** When set, attach to an existing worktree and use the continuation prompt. */
  resume?: ResumeContext;
}): Promise<StoryExecutionResult> {
  const { story, repoPath, baseBranch, usedSlugs, onEvent, signal, resume } = args;
  const slugBase = slugify(`${story.numericId ?? args.storyIndex + 1}-${story.title}`);

  const release = tryClaimStory(repoPath, slugBase);
  if (!release) {
    onEvent({
      kind: 'log',
      stream: 'info',
      line: `story "${story.title}" is already being executed — skipping duplicate start`,
    });
    return { success: false, error: 'already running', duplicate: true };
  }

  onEvent({ kind: 'status', status: 'running' });

  let worktree: WorktreeHandle | null = null;
  let stopPoller: (() => Promise<void>) | null = null;
  let reachedReview = false;
  try {
    await ensureTaskDir(repoPath, story).catch((e) => {
      onEvent({ kind: 'log', stream: 'stderr', line: `task dir prep failed: ${e instanceof Error ? e.message : String(e)}` });
    });

    if (resume) {
      worktree = await attachWorktree({
        repoPath,
        branch: resume.branch,
        onInfo: (msg) => onEvent({ kind: 'log', stream: 'info', line: msg }),
      });
    } else {
      const slug = uniqueSlug(slugBase, usedSlugs);
      usedSlugs.add(slug);
      worktree = await createWorktree({
        repoPath,
        slug,
        baseBranch,
        onInfo: (msg) => onEvent({ kind: 'log', stream: 'info', line: msg }),
      });
    }
    onEvent({ kind: 'log', stream: 'info', line: `worktree ${worktree.path} (branch ${worktree.branch})` });
    onEvent({ kind: 'branch', branch: worktree.branch });

    const hookResult = await installPostCommitHook(repoPath).catch((e) => {
      onEvent({
        kind: 'log',
        stream: 'stderr',
        line: `post-commit hook install failed: ${e instanceof Error ? e.message : String(e)}`,
      });
      return null;
    });
    if (hookResult?.kind === 'foreign') {
      onEvent({
        kind: 'log',
        stream: 'info',
        line: `post-commit hook exists and is not ours — falling back to polling. First lines: ${hookResult.preview.split('\n').join(' | ')}`,
      });
      stopPoller = startCommitPoller({
        repoPath,
        worktreePath: worktree.path,
        branch: worktree.branch,
        baseBranch,
        taskId: story.taskId,
        onInfo: (msg) => onEvent({ kind: 'log', stream: 'info', line: msg }),
      });
    } else if (hookResult) {
      onEvent({ kind: 'log', stream: 'info', line: `post-commit hook ${hookResult.kind}` });
    }

    const abort = new AbortController();
    const cancelWatcher = setInterval(() => {
      if (signal.cancelled && !abort.signal.aborted) abort.abort();
    }, 250);

    if (!resume?.pushOnly) {
      const journalAbs = path.resolve(journalPath(repoPath, story.taskId));
      let assistantText = '';

      const attachedFiles = await listTaskFiles(repoPath, story.taskId).catch(() => []);
      const attachedNames = attachedFiles.map((f) => f.name);
      const addDirs = attachedFiles.length > 0 ? [taskFilesDir(repoPath, story.taskId)] : [];
      if (addDirs.length > 0) {
        onEvent({ kind: 'log', stream: 'info', line: `attached files: ${attachedNames.join(', ')}` });
      }

      const handle = runClaudeInWorktree(
        {
          cwd: worktree.path,
          prompt: resume ? resume.prompt : buildPrompt(story, attachedNames),
          addDirs,
          model: implementationModelFor(story),
          env: { NIGHTCODER_JOURNAL_PATH: journalAbs },
        },
        {
          onEvent: (e) => {
            const tag = e.kind === 'tool' ? `tool: ${e.line}` : e.kind === 'text' ? e.line : e.kind === 'error' ? `error: ${e.line}` : e.line;
            onEvent({ kind: 'log', stream: 'stdout', line: tag });
          },
          onStderr: (line) => onEvent({ kind: 'log', stream: 'stderr', line }),
          onAssistantText: (text) => { assistantText += text; },
        }
      );

      const runnerCancelWatcher = setInterval(() => {
        if (signal.cancelled) handle.cancel();
      }, 250);

      const result = await handle.result;
      clearInterval(runnerCancelWatcher);

      const planBlock = extractPlanBlock(assistantText);
      if (planBlock) {
        await writePlanMd(repoPath, story.taskId, planBlock).catch((e) => {
          onEvent({ kind: 'log', stream: 'stderr', line: `plan.md write failed: ${e instanceof Error ? e.message : String(e)}` });
        });
        onEvent({ kind: 'log', stream: 'info', line: 'captured plan block → plan.md' });
      }

      if (signal.cancelled) {
        clearInterval(cancelWatcher);
        onEvent({ kind: 'status', status: 'cancelled' });
        return { success: false, error: 'cancelled' };
      }
      if (result.limitHit) {
        clearInterval(cancelWatcher);
        onEvent({ kind: 'limit-hit', resetsAt: result.limitResetsAt ?? null });
        onEvent({ kind: 'status', status: 'interrupted' });
        return {
          success: false,
          error: 'usage limit reached',
          limitHit: true,
          limitResetsAt: result.limitResetsAt ?? null,
        };
      }
      if (!result.success) {
        clearInterval(cancelWatcher);
        onEvent({ kind: 'status', status: 'failed' });
        return { success: false, error: result.error ?? `stop_reason=${result.stopReason ?? '?'}` };
      }
    } else {
      onEvent({ kind: 'log', stream: 'info', line: 'push-only resume — skipping claude, jumping straight to push + PR' });
    }

    let autoMergeHandle: AutoMergeHandle | null = null;
    try {
      onEvent({ kind: 'status', status: 'pushing' });
      const madeCommit = await commitAllIfDirty(
        worktree.path,
        `chore(nightcoder): flush uncommitted changes for ${story.title}`,
        { signal: abort.signal }
      );
      if (madeCommit) onEvent({ kind: 'log', stream: 'info', line: 'flushed uncommitted changes into final commit' });

      const autoResolveEnabled = story.requiresHumanReview === false;
      if (autoResolveEnabled) {
        onEvent({ kind: 'log', stream: 'info', line: `auto-resolve enabled — rebasing on origin/${baseBranch} before push` });
        const cr = await resolveConflicts({
          worktreePath: worktree.path,
          baseBranch,
          story,
          model: implementationModelFor(story),
          signal,
          onEvent: (e: ConflictResolverEvent) => {
            if (e.kind === 'log') {
              onEvent({ kind: 'log', stream: e.stream, line: e.line });
            } else if (e.kind === 'conflict-detected') {
              onEvent({ kind: 'conflict', conflictedFiles: e.conflictedFiles, attempt: e.attempt, resolved: false });
            } else if (e.kind === 'conflict-resolved') {
              onEvent({ kind: 'conflict', conflictedFiles: [], attempt: e.attempt, resolved: true });
            }
          },
        });
        if (cr.kind === 'failed') {
          if (cr.reason === 'cancelled') {
            clearInterval(cancelWatcher);
            onEvent({ kind: 'status', status: 'cancelled' });
            return { success: false, error: 'cancelled' };
          }
          onEvent({ kind: 'log', stream: 'stderr', line: `auto-resolve failed: ${cr.message}` });
          onEvent({ kind: 'status', status: 'conflict' });
          return { success: false, error: `unresolved conflicts: ${cr.conflictedFiles.join(', ') || cr.message}` };
        }
      }

      await gitPush(worktree.path, worktree.branch, { signal: abort.signal });
      onEvent({ kind: 'log', stream: 'info', line: `pushed ${worktree.branch}` });
      // A prior push-only resume or interrupted PR step may have already created
      // the PR. Reuse it instead of re-running `gh pr create` (which errors on
      // "a pull request already exists").
      const existingPr = await ghFindPrForBranch({ cwd: worktree.path, branch: worktree.branch, signal: abort.signal });
      const prUrl = existingPr ?? await ghCreatePr({
        cwd: worktree.path,
        title: story.title,
        body: buildPrBody(story),
        baseBranch,
        signal: abort.signal,
      });
      if (existingPr) {
        onEvent({ kind: 'log', stream: 'info', line: `reusing existing PR ${existingPr}` });
      }
      onEvent({ kind: 'pr', url: prUrl, branch: worktree.branch });

      if (autoResolveEnabled) {
        onEvent({ kind: 'status', status: 'merging' });
        autoMergeHandle = startAutoMerge({
          worktreePath: worktree.path,
          branch: worktree.branch,
          baseBranch,
          story,
          model: implementationModelFor(story),
          signal,
          onEvent: (e: AutoMergeEvent) => {
            if (e.kind === 'log') {
              onEvent({ kind: 'log', stream: e.stream, line: e.line });
            } else if (e.kind === 'mergeability') {
              onEvent({ kind: 'auto-merge', state: 'polling', message: e.state });
            } else if (e.kind === 'merged') {
              onEvent({ kind: 'auto-merge', state: 'merged' });
            } else if (e.kind === 'failed') {
              onEvent({ kind: 'auto-merge', state: 'failed', message: e.message });
            }
          },
        });
        await autoMergeHandle.done;
        if (signal.cancelled) {
          onEvent({ kind: 'status', status: 'cancelled' });
          return { success: false, error: 'cancelled' };
        }
        onEvent({ kind: 'status', status: 'merged' });
      } else {
        onEvent({ kind: 'status', status: 'review' });
      }
      reachedReview = true;
      return { success: true, prUrl, branch: worktree.branch };
    } finally {
      clearInterval(cancelWatcher);
      autoMergeHandle?.stop();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (signal.cancelled) {
      onEvent({ kind: 'log', stream: 'info', line: 'cancelled during push/PR' });
      onEvent({ kind: 'status', status: 'cancelled' });
      return { success: false, error: 'cancelled' };
    }
    onEvent({ kind: 'log', stream: 'stderr', line: message });
    onEvent({ kind: 'status', status: 'failed' });
    return { success: false, error: message };
  } finally {
    if (stopPoller) {
      await stopPoller().catch(() => {});
    }
    // Keep the worktree around on failure / cancellation so the user can resume
    // into it; only clean up on the success path where the branch is already
    // safely pushed. `release()` always runs — the in-memory slug claim is
    // released even if the worktree persists.
    if (worktree && reachedReview) {
      await worktree.cleanup().catch((e) => {
        onEvent({ kind: 'log', stream: 'stderr', line: `worktree cleanup failed: ${e instanceof Error ? e.message : String(e)}` });
      });
    } else if (worktree) {
      onEvent({
        kind: 'log',
        stream: 'info',
        line: `worktree kept at ${worktree.path} (branch ${worktree.branch}) for potential resume`,
      });
    }
    release();
  }
}
