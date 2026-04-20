import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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
    await execFileAsync('git', ['push', '-u', 'origin', branch], {
      cwd: worktreePath,
      env: { ...process.env },
    });
  }

  async createPr(opts: CreatePrOptions): Promise<string> {
    const { stdout } = await execFileAsync(
      'gh',
      [
        'pr', 'create',
        '--base', opts.baseBranch,
        '--head', opts.branch,
        '--title', opts.title,
        '--body', opts.body,
      ],
      {
        cwd: opts.worktreePath,
        env: { ...process.env },
      },
    );
    return stdout.trim();
  }
}
