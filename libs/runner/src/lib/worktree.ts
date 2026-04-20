import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function addWorktree(
  repoPath: string,
  worktreePath: string,
  branch: string,
  baseBranch: string,
): Promise<void> {
  await execFileAsync(
    'git',
    ['worktree', 'add', worktreePath, '-b', branch, baseBranch],
    { cwd: repoPath },
  );
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
): Promise<void> {
  await execFileAsync(
    'git',
    ['worktree', 'remove', '--force', worktreePath],
    { cwd: repoPath },
  );
  await execFileAsync('git', ['worktree', 'prune'], { cwd: repoPath }).catch(() => void 0);
}

export async function hasNewCommits(
  worktreePath: string,
  baseBranch: string,
): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--oneline', `origin/${baseBranch}..HEAD`],
      { cwd: worktreePath },
    ).catch(() =>
      execFileAsync(
        'git',
        ['log', '--oneline', `${baseBranch}..HEAD`],
        { cwd: worktreePath },
      ),
    );
    return stdout.trim().length > 0;
  } catch {
    // git command itself failed (bad baseBranch name, corrupted repo, missing ref)
    // return false so orchestrator marks subtask as FAILED rather than crashing
    return false;
  }
}
