import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { Story } from '@nightcoder/shared-types/ipc';
import type { RunnerHandle } from '@nightcoder/claude-runner';
import { resolveConflicts, type ConflictResolverEvent } from './conflict-resolver';

const execFileP = promisify(execFile);

let upstream: string;
let workdir: string;

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileP('git', args, { cwd });
}

async function configureRepo(cwd: string): Promise<void> {
  await git(cwd, ['config', 'user.email', 't@t']);
  await git(cwd, ['config', 'user.name', 't']);
  await git(cwd, ['config', 'commit.gpgsign', 'false']);
  await git(cwd, ['config', 'tag.gpgsign', 'false']);
}

async function commit(cwd: string, message: string): Promise<void> {
  await git(cwd, ['add', '-A']);
  await git(cwd, ['commit', '--no-gpg-sign', '-m', message]);
}

const story: Story = {
  taskId: 't1',
  title: 'Cool feature',
  description: 'Adds a cool feature',
  acceptanceCriteria: ['It works'],
  affectedFiles: ['file.txt'],
};

beforeEach(async () => {
  upstream = await mkdtemp(path.join(os.tmpdir(), 'nc-cr-up-'));
  await git(upstream, ['init', '--initial-branch=main']);
  await configureRepo(upstream);
  await writeFile(path.join(upstream, 'file.txt'), 'base\n');
  await commit(upstream, 'initial');

  workdir = await mkdtemp(path.join(os.tmpdir(), 'nc-cr-wd-'));
  await git(workdir, ['init', '--initial-branch=main']);
  await configureRepo(workdir);
  await git(workdir, ['remote', 'add', 'origin', upstream]);
  await git(workdir, ['fetch', 'origin', 'main']);
  await git(workdir, ['reset', '--hard', 'origin/main']);
  await git(workdir, ['checkout', '-b', 'feat/branch']);
});

afterEach(async () => {
  await rm(upstream, { recursive: true, force: true });
  await rm(workdir, { recursive: true, force: true });
});

function noopRunner(): RunnerHandle {
  return {
    cancel: () => {},
    result: Promise.resolve({ success: true, exitCode: 0, stopReason: 'end_turn' }),
  };
}

describe('resolveConflicts', () => {
  it('returns clean when base has not moved', async () => {
    await writeFile(path.join(workdir, 'feat.txt'), 'feat\n');
    await commit(workdir, 'feat');

    const events: ConflictResolverEvent[] = [];
    const result = await resolveConflicts({
      worktreePath: workdir,
      baseBranch: 'main',
      story,
      signal: { cancelled: false },
      onEvent: (e) => events.push(e),
      runner: noopRunner,
    });

    expect(result.kind).toBe('clean');
    expect(events.some((e) => e.kind === 'conflict-detected')).toBe(false);
  });

  it('returns resolved when the AI rewrites the conflicted file', async () => {
    await writeFile(path.join(workdir, 'file.txt'), 'feature side\n');
    await commit(workdir, 'feature side');

    await writeFile(path.join(upstream, 'file.txt'), 'main side\n');
    await commit(upstream, 'main side');

    const events: ConflictResolverEvent[] = [];
    const fakeRunner = (options: { cwd: string }): RunnerHandle => {
      return {
        cancel: () => {},
        result: (async () => {
          await writeFile(path.join(options.cwd, 'file.txt'), 'merged feature + main\n');
          return { success: true, exitCode: 0, stopReason: 'end_turn' as const };
        })(),
      };
    };

    const result = await resolveConflicts({
      worktreePath: workdir,
      baseBranch: 'main',
      story,
      signal: { cancelled: false },
      onEvent: (e) => events.push(e),
      runner: fakeRunner,
    });

    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.attempts).toBe(1);
      expect(result.filesTouched).toContain('file.txt');
    }
    const finalContents = await readFile(path.join(workdir, 'file.txt'), 'utf8');
    expect(finalContents).toBe('merged feature + main\n');
    expect(events.some((e) => e.kind === 'conflict-detected')).toBe(true);
    expect(events.some((e) => e.kind === 'conflict-resolved')).toBe(true);
  });

  it('gives up after maxAttempts and leaves the rebase in progress', async () => {
    await writeFile(path.join(workdir, 'file.txt'), 'feature side\n');
    await commit(workdir, 'feature side');
    await writeFile(path.join(upstream, 'file.txt'), 'main side\n');
    await commit(upstream, 'main side');

    const result = await resolveConflicts({
      worktreePath: workdir,
      baseBranch: 'main',
      story,
      maxAttempts: 2,
      signal: { cancelled: false },
      onEvent: () => {},
      runner: noopRunner,
    });

    expect(result.kind).toBe('failed');
    if (result.kind === 'failed') {
      expect(result.reason).toBe('max-attempts');
      expect(result.attempts).toBe(2);
      expect(result.conflictedFiles).toContain('file.txt');
    }
    // Worktree is preserved in conflicted state for manual recovery.
    const { stdout } = await execFileP('git', ['status', '--porcelain'], { cwd: workdir });
    expect(stdout).toMatch(/^UU /m);
  });

  it('honours cancellation mid-attempt', async () => {
    await writeFile(path.join(workdir, 'file.txt'), 'feature side\n');
    await commit(workdir, 'feature side');
    await writeFile(path.join(upstream, 'file.txt'), 'main side\n');
    await commit(upstream, 'main side');

    const signal = { cancelled: false };
    let cancelCalled = false;
    const slowRunner = (): RunnerHandle => {
      let resolveResult!: (value: { success: boolean; exitCode: number | null; error?: string }) => void;
      const result = new Promise<{ success: boolean; exitCode: number | null; error?: string }>((resolve) => {
        resolveResult = resolve;
      });
      return {
        cancel: () => {
          cancelCalled = true;
          resolveResult({ success: false, exitCode: null, error: 'cancelled' });
        },
        result,
      };
    };

    setTimeout(() => { signal.cancelled = true; }, 50);

    const result = await resolveConflicts({
      worktreePath: workdir,
      baseBranch: 'main',
      story,
      signal,
      onEvent: () => {},
      runner: slowRunner,
    });

    expect(result.kind).toBe('failed');
    if (result.kind === 'failed') expect(result.reason).toBe('cancelled');
    expect(cancelCalled).toBe(true);
  });
});
