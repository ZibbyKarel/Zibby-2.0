import { Injectable } from '@nestjs/common';
import { exec, ExecOptions } from 'child_process';

function execAsync(cmd: string, opts: ExecOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

interface CreatePrOptions {
  worktreePath: string;
  baseBranch: string;
  branch: string;
  title: string;
  body: string;
}

@Injectable()
export class GitHubService {
  async pushBranch(worktreePath: string, branch: string): Promise<void> {
    await execAsync(`git push -u origin ${branch}`, {
      cwd: worktreePath,
      env: { ...process.env },
    });
  }

  async createPr(opts: CreatePrOptions): Promise<string> {
    const escapedTitle = opts.title.replace(/"/g, '\\"');
    const escapedBody = opts.body.replace(/"/g, '\\"');
    const { stdout } = await execAsync(
      `gh pr create --base "${opts.baseBranch}" --head "${opts.branch}" --title "${escapedTitle}" --body "${escapedBody}"`,
      {
        cwd: opts.worktreePath,
        env: { ...process.env, GITHUB_TOKEN: process.env['GITHUB_TOKEN'] ?? '' },
      },
    );
    return stdout.trim();
  }
}
