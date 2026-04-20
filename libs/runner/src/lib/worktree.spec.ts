import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { addWorktree, removeWorktree, hasNewCommits } from './worktree';

describe('worktree helpers', () => {
  let repoPath: string;

  beforeAll(() => {
    repoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-test-'));
    execSync('git init -b main', { cwd: repoPath });
    execSync('git config user.email "test@test.com"', { cwd: repoPath });
    execSync('git config user.name "Test"', { cwd: repoPath });
    execSync('echo "init" > README.md && git add . && git commit -m "init"', {
      cwd: repoPath,
      shell: '/bin/sh',
    });
  });

  afterAll(() => {
    fs.rmSync(repoPath, { recursive: true, force: true });
  });

  it('addWorktree creates a worktree directory with a new branch', async () => {
    const worktreePath = path.join(repoPath, '.worktrees', 'test-wt');
    await addWorktree(repoPath, worktreePath, 'task/test-wt');
    expect(fs.existsSync(worktreePath)).toBe(true);
    await removeWorktree(repoPath, worktreePath);
  });

  it('removeWorktree removes the directory and deregisters the worktree', async () => {
    const worktreePath = path.join(repoPath, '.worktrees', 'test-wt2');
    await addWorktree(repoPath, worktreePath, 'task/test-wt2');
    await removeWorktree(repoPath, worktreePath);
    expect(fs.existsSync(worktreePath)).toBe(false);
  });

  it('hasNewCommits returns false when no commits beyond base branch', async () => {
    const worktreePath = path.join(repoPath, '.worktrees', 'test-wt3');
    await addWorktree(repoPath, worktreePath, 'task/test-wt3');
    const result = await hasNewCommits(worktreePath, 'main');
    expect(result).toBe(false);
    await removeWorktree(repoPath, worktreePath);
  });

  it('hasNewCommits returns true after committing in the worktree', async () => {
    const worktreePath = path.join(repoPath, '.worktrees', 'test-wt4');
    await addWorktree(repoPath, worktreePath, 'task/test-wt4');
    execSync('echo "change" >> README.md && git add . && git commit -m "add change"', {
      cwd: worktreePath,
      shell: '/bin/sh',
    });
    const result = await hasNewCommits(worktreePath, 'main');
    expect(result).toBe(true);
    await removeWorktree(repoPath, worktreePath);
  });
});
