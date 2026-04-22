import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { access, copyFile, mkdir, rm } from 'node:fs/promises';

const execFileP = promisify(execFile);
const OPTS = { maxBuffer: 8 * 1024 * 1024 } as const;

const LOCAL_AI_SETTINGS_FILES = [
  '.claude/settings.local.json',
  '.claude/CLAUDE.local.md',
  '.agents/settings.local.json',
  '.env.local',
];

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function mirrorLocalAiSettings(
  sourceRoot: string,
  destRoot: string,
  onInfo?: (msg: string) => void
): Promise<string[]> {
  if (process.env.ZIBBY_INHERIT_LOCAL_AI === '0') return [];
  const copied: string[] = [];
  for (const rel of LOCAL_AI_SETTINGS_FILES) {
    const src = path.join(sourceRoot, rel);
    if (!(await exists(src))) continue;
    const dest = path.join(destRoot, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    try {
      await copyFile(src, dest);
      copied.push(rel);
    } catch (err) {
      onInfo?.(`failed to mirror ${rel}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return copied;
}

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
  mirroredFiles: string[];
  cleanup: () => Promise<void>;
};

export async function createWorktree(args: {
  repoPath: string;
  slug: string;
  baseBranch: string;
  onInfo?: (msg: string) => void;
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

  const mirroredFiles = await mirrorLocalAiSettings(args.repoPath, worktreePath, args.onInfo);
  if (mirroredFiles.length > 0) {
    args.onInfo?.(`mirrored local AI settings: ${mirroredFiles.join(', ')}`);
  }

  return {
    path: worktreePath,
    branch,
    mirroredFiles,
    cleanup: async () => {
      for (const rel of mirroredFiles) {
        await rm(path.join(worktreePath, rel), { force: true }).catch(() => undefined);
      }
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
