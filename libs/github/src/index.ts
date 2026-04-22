import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const OPTS = { maxBuffer: 8 * 1024 * 1024 } as const;

export async function hasAnyCommits(cwd: string): Promise<boolean> {
  try {
    await execFileP('git', ['rev-parse', 'HEAD'], { cwd, ...OPTS });
    return true;
  } catch {
    return false;
  }
}

export async function gitStatusIsClean(cwd: string): Promise<boolean> {
  const { stdout } = await execFileP('git', ['status', '--porcelain'], { cwd, ...OPTS });
  return stdout.trim().length === 0;
}

export async function commitAllIfDirty(cwd: string, message: string): Promise<boolean> {
  const clean = await gitStatusIsClean(cwd);
  if (clean) return false;
  await execFileP('git', ['add', '-A'], { cwd, ...OPTS });
  await execFileP('git', ['commit', '-m', message], { cwd, ...OPTS });
  return true;
}

export async function gitPush(cwd: string, branch: string): Promise<void> {
  await execFileP('git', ['push', '-u', 'origin', branch], { cwd, ...OPTS });
}

export type CreatePrArgs = {
  cwd: string;
  title: string;
  body: string;
  baseBranch: string;
  draft?: boolean;
};

const PR_URL_RE = /https:\/\/github\.com\/[^\s]+\/pull\/\d+/;

export async function ghCreatePr(args: CreatePrArgs): Promise<string> {
  const ghArgs = ['pr', 'create', '--title', args.title, '--body', args.body, '--base', args.baseBranch];
  if (args.draft) ghArgs.push('--draft');
  const { stdout } = await execFileP('gh', ghArgs, { cwd: args.cwd, ...OPTS });
  const match = stdout.match(PR_URL_RE);
  if (!match) {
    throw new Error(`gh pr create did not return a PR URL. stdout: ${stdout.slice(0, 400)}`);
  }
  return match[0];
}

export async function ghAuthStatus(): Promise<{ ok: boolean; stdout: string }> {
  try {
    const { stdout } = await execFileP('gh', ['auth', 'status'], OPTS);
    return { ok: true, stdout };
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? '';
    return { ok: false, stdout: stderr };
  }
}
