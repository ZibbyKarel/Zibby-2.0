import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Story } from '@nightcoder/shared-types/ipc';
import { runClaudeInWorktree, type RunnerHandle } from '@nightcoder/claude-runner';

const execFileP = promisify(execFile);
const OPTS = { maxBuffer: 8 * 1024 * 1024 } as const;
const DEFAULT_MAX_ATTEMPTS = Number.parseInt(
  process.env.NIGHTCODER_AUTO_RESOLVE_MAX_ATTEMPTS ?? '',
  10,
);
const MAX_ATTEMPTS_FALLBACK = 3;
const DEFAULT_PER_ATTEMPT_TIMEOUT_MS = 10 * 60_000;

export type ConflictResolverEvent =
  | { kind: 'log'; stream: 'stdout' | 'stderr' | 'info'; line: string }
  | { kind: 'conflict-detected'; conflictedFiles: string[]; attempt: number }
  | { kind: 'conflict-resolved'; attempt: number };

export type ConflictResolverResult =
  | { kind: 'clean' }
  | { kind: 'resolved'; attempts: number; filesTouched: string[] }
  | {
      kind: 'failed';
      reason: 'max-attempts' | 'timeout' | 'cancelled' | 'rebase-error';
      conflictedFiles: string[];
      attempts: number;
      message: string;
    };

export type ResolveConflictsArgs = {
  worktreePath: string;
  /** Just the branch name (e.g. 'main') — we prefix `origin/` ourselves. */
  baseBranch: string;
  story: Story;
  model?: string;
  maxAttempts?: number;
  perAttemptTimeoutMs?: number;
  signal: { cancelled: boolean };
  onEvent: (event: ConflictResolverEvent) => void;
  /** Injected for tests. Defaults to the real runner. */
  runner?: typeof runClaudeInWorktree;
};

/**
 * Try to integrate the latest `origin/<baseBranch>` into the worktree's branch
 * via `git rebase`. If conflicts arise, spawn the AI executor inside the
 * worktree to edit the conflict markers and continue the rebase. Worktree is
 * left as-is on failure so the user can finish the rebase manually.
 */
export async function resolveConflicts(
  args: ResolveConflictsArgs,
): Promise<ConflictResolverResult> {
  const maxAttempts =
    args.maxAttempts ??
    (Number.isFinite(DEFAULT_MAX_ATTEMPTS) && DEFAULT_MAX_ATTEMPTS > 0
      ? DEFAULT_MAX_ATTEMPTS
      : MAX_ATTEMPTS_FALLBACK);
  const perAttemptTimeoutMs =
    args.perAttemptTimeoutMs ?? DEFAULT_PER_ATTEMPT_TIMEOUT_MS;
  const runner = args.runner ?? runClaudeInWorktree;

  const log = (line: string, stream: 'stdout' | 'stderr' | 'info' = 'info') =>
    args.onEvent({ kind: 'log', stream, line });

  if (args.signal.cancelled) {
    return cancelled([], 0);
  }

  try {
    await execFileP('git', ['fetch', 'origin', args.baseBranch], {
      cwd: args.worktreePath,
      ...OPTS,
    });
  } catch (err) {
    return {
      kind: 'failed',
      reason: 'rebase-error',
      conflictedFiles: [],
      attempts: 0,
      message: `git fetch origin ${args.baseBranch} failed: ${errMessage(err)}`,
    };
  }

  const rebaseStart = await runGit(args.worktreePath, [
    'rebase',
    `origin/${args.baseBranch}`,
  ]);
  if (rebaseStart.code === 0) {
    return { kind: 'clean' };
  }
  if (args.signal.cancelled) return cancelled([], 0);

  const filesTouched = new Set<string>();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (args.signal.cancelled) return cancelled(Array.from(filesTouched), attempt - 1);

    const conflictedFiles = await listConflictedFiles(args.worktreePath);
    if (conflictedFiles.length === 0) {
      // Nothing left to fix but rebase is still in progress — try to continue.
      const cont = await runGit(args.worktreePath, ['rebase', '--continue'], {
        GIT_EDITOR: 'true',
      });
      if (cont.code === 0) {
        return { kind: 'resolved', attempts: attempt - 1, filesTouched: Array.from(filesTouched) };
      }
      continue;
    }

    args.onEvent({ kind: 'conflict-detected', conflictedFiles, attempt });
    log(`attempt ${attempt}/${maxAttempts}: ${conflictedFiles.length} conflicted file(s): ${conflictedFiles.join(', ')}`);

    for (const f of conflictedFiles) filesTouched.add(f);

    const prompt = buildResolutionPrompt({
      story: args.story,
      conflictedFiles,
      baseBranch: args.baseBranch,
    });

    const handle: RunnerHandle = runner(
      {
        cwd: args.worktreePath,
        prompt,
        model: args.model,
      },
      {
        onEvent: (e) => {
          const line = e.kind === 'tool' ? `tool: ${e.line}` : e.kind === 'text' ? e.line : e.kind === 'error' ? `error: ${e.line}` : e.line;
          log(line, 'stdout');
        },
        onStderr: (line) => log(line, 'stderr'),
      },
    );

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      handle.cancel();
    }, perAttemptTimeoutMs);
    const cancelWatcher = setInterval(() => {
      if (args.signal.cancelled) handle.cancel();
    }, 250);

    let runResult;
    try {
      runResult = await handle.result;
    } finally {
      clearTimeout(timeout);
      clearInterval(cancelWatcher);
    }

    if (args.signal.cancelled) return cancelled(Array.from(filesTouched), attempt);
    if (timedOut) {
      return {
        kind: 'failed',
        reason: 'timeout',
        conflictedFiles,
        attempts: attempt,
        message: `claude resolver timed out after ${perAttemptTimeoutMs}ms on attempt ${attempt}`,
      };
    }
    if (!runResult.success) {
      log(`resolver attempt ${attempt} returned unsuccessful: ${runResult.error ?? runResult.stopReason ?? '?'}`, 'stderr');
      // Continue to the next attempt — the runner may still have left useful edits.
    }

    const stillUnresolved = await hasUnresolvedMarkers(args.worktreePath, conflictedFiles);
    if (stillUnresolved.length > 0) {
      log(`conflict markers still present in: ${stillUnresolved.join(', ')}`, 'stderr');
      continue;
    }

    await runGit(args.worktreePath, ['add', '-A']);
    const cont = await runGit(args.worktreePath, ['rebase', '--continue'], {
      GIT_EDITOR: 'true',
    });
    if (cont.code === 0) {
      args.onEvent({ kind: 'conflict-resolved', attempt });
      return {
        kind: 'resolved',
        attempts: attempt,
        filesTouched: Array.from(filesTouched),
      };
    }
    log(`git rebase --continue still failed after attempt ${attempt}: ${cont.stderr.trim().slice(-400)}`, 'stderr');
    // Loop again — there may be a follow-up conflict from the next replayed commit.
  }

  return {
    kind: 'failed',
    reason: 'max-attempts',
    conflictedFiles: await listConflictedFiles(args.worktreePath),
    attempts: maxAttempts,
    message: `gave up after ${maxAttempts} attempt(s)`,
  };
}

function cancelled(files: string[], attempts: number): ConflictResolverResult {
  return {
    kind: 'failed',
    reason: 'cancelled',
    conflictedFiles: files,
    attempts,
    message: 'cancelled',
  };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function runGit(
  cwd: string,
  args: string[],
  extraEnv: Record<string, string> = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileP('git', args, {
      cwd,
      ...OPTS,
      env: { ...process.env, ...extraEnv },
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    return {
      code: typeof e.code === 'number' ? e.code : 1,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? '',
    };
  }
}

async function listConflictedFiles(cwd: string): Promise<string[]> {
  const { stdout } = await execFileP(
    'git',
    ['diff', '--name-only', '--diff-filter=U'],
    { cwd, ...OPTS },
  );
  return stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

async function hasUnresolvedMarkers(
  cwd: string,
  files: readonly string[],
): Promise<string[]> {
  const remaining: string[] = [];
  for (const f of files) {
    try {
      const { stdout } = await execFileP(
        'git',
        ['grep', '-l', '-E', '^(<{7}|={7}|>{7})', '--', f],
        { cwd, ...OPTS },
      );
      if (stdout.trim().length > 0) remaining.push(f);
    } catch (err) {
      // `git grep` exits 1 when no matches — that's the happy path.
      const e = err as { code?: number };
      if (e.code !== 1) remaining.push(f);
    }
  }
  return remaining;
}

export function buildResolutionPrompt(args: {
  story: Story;
  conflictedFiles: readonly string[];
  baseBranch: string;
}): string {
  const ac = args.story.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const files = args.conflictedFiles.map((f) => `- ${f}`).join('\n');
  return `You are resolving a git rebase conflict for this user story.

# ${args.story.title}

${args.story.description}

## Acceptance criteria

${ac}

## Conflict context

We are rebasing this branch onto \`origin/${args.baseBranch}\`. The following files contain unresolved conflict markers (\`<<<<<<<\`, \`=======\`, \`>>>>>>>\`):

${files}

## Strict instructions

- Do NOT run \`git rebase\`, \`git rebase --continue\`, \`git rebase --abort\`, \`git add\`, \`git commit\`, or any other git command. The harness will stage the files and continue the rebase after you stop.
- Do NOT delete files. Do NOT add new files. Only edit the listed files.
- Remove every \`<<<<<<<\`, \`=======\`, and \`>>>>>>>\` marker. The final file must contain no conflict markers.
- Preserve both intents wherever they are independent. When the two sides are mutually exclusive, prefer the semantics from \`origin/${args.baseBranch}\` for unrelated cosmetic drift (formatting, imports, lint-driven reorderings) and prefer this branch's semantics for changes that implement the story's acceptance criteria above.
- After editing, simply stop. Do not produce a final summary commit message — the harness handles that.`;
}
