import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { rm } from 'node:fs/promises';

const execFileP = promisify(execFile);
const OPTS = { maxBuffer: 8 * 1024 * 1024 } as const;

export async function detectBaseBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execFileP('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], {
      cwd: repoPath,
      ...OPTS,
    });
    const match = stdout.trim().match(/refs\/remotes\/origin\/(.+)$/);
    if (match) return match[1];
  } catch {
    // no origin HEAD set — fall back
  }
  for (const candidate of ['main', 'master']) {
    try {
      await execFileP('git', ['rev-parse', '--verify', candidate], { cwd: repoPath, ...OPTS });
      return candidate;
    } catch {
      // next candidate
    }
  }
  const { stdout } = await execFileP('git', ['branch', '--show-current'], {
    cwd: repoPath,
    ...OPTS,
  });
  return stdout.trim() || 'main';
}

export type WorktreeHandle = {
  path: string;
  branch: string;
  cleanup: () => Promise<void>;
};

export async function createWorktree(args: {
  repoPath: string;
  slug: string;
  baseBranch: string;
}): Promise<WorktreeHandle> {
  const worktreePath = path.join(args.repoPath, '.worktrees', args.slug);
  const branch = `zibby/${args.slug}`;

  try {
    await execFileP(
      'git',
      ['worktree', 'add', '-b', branch, worktreePath, args.baseBranch],
      { cwd: args.repoPath, ...OPTS }
    );
  } catch (err) {
    throw new Error(
      `git worktree add failed: ${(err as { stderr?: string; message: string }).stderr ?? (err as Error).message}`
    );
  }

  return {
    path: worktreePath,
    branch,
    cleanup: async () => {
      try {
        await execFileP('git', ['worktree', 'remove', '--force', worktreePath], {
          cwd: args.repoPath,
          ...OPTS,
        });
      } catch {
        await rm(worktreePath, { recursive: true, force: true });
        await execFileP('git', ['worktree', 'prune'], { cwd: args.repoPath, ...OPTS }).catch(() => undefined);
      }
    },
  };
}
