import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function addWorktree(
  repoPath: string,
  worktreePath: string,
  branch: string,
): Promise<void> {
  await execAsync(`git worktree add "${worktreePath}" -b "${branch}"`, { cwd: repoPath });
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
): Promise<void> {
  await execAsync(`git worktree remove --force "${worktreePath}"`, { cwd: repoPath });
  await execAsync('git worktree prune', { cwd: repoPath }).catch(() => void 0);
}

export async function hasNewCommits(
  worktreePath: string,
  baseBranch: string,
): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `git log --oneline "origin/${baseBranch}..HEAD" 2>/dev/null || git log --oneline "${baseBranch}..HEAD"`,
      { cwd: worktreePath, shell: '/bin/sh' },
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
