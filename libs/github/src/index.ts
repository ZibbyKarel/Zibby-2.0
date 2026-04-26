import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const BASE_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: 'echo',
};
const OPTS = { maxBuffer: 8 * 1024 * 1024, env: BASE_ENV } as const;

type CancelOpts = { signal?: AbortSignal };

export async function hasAnyCommits(cwd: string): Promise<boolean> {
  try {
    await execFileP('git', ['rev-parse', 'HEAD'], { cwd, ...OPTS });
    return true;
  } catch {
    return false;
  }
}

export async function gitStatusIsClean(cwd: string, opts: CancelOpts = {}): Promise<boolean> {
  const { stdout } = await execFileP('git', ['status', '--porcelain'], {
    cwd,
    ...OPTS,
    signal: opts.signal,
  });
  return stdout.trim().length === 0;
}

export async function commitAllIfDirty(
  cwd: string,
  message: string,
  opts: CancelOpts = {}
): Promise<boolean> {
  const clean = await gitStatusIsClean(cwd, opts);
  if (clean) return false;
  await execFileP('git', ['add', '-A'], { cwd, ...OPTS, signal: opts.signal });
  await execFileP('git', ['commit', '-m', message], { cwd, ...OPTS, signal: opts.signal });
  return true;
}

export async function gitPush(cwd: string, branch: string, opts: CancelOpts = {}): Promise<void> {
  await execFileP('git', ['push', '-u', 'origin', branch], {
    cwd,
    ...OPTS,
    signal: opts.signal,
  });
}

/**
 * Force-push using `--force-with-lease` so we never overwrite a commit on the
 * remote that we haven't seen locally. Used after auto-resolving a rebase
 * conflict on a story branch that was already pushed.
 */
export async function gitForcePushWithLease(
  cwd: string,
  branch: string,
  opts: CancelOpts = {},
): Promise<void> {
  await execFileP('git', ['push', '--force-with-lease', 'origin', branch], {
    cwd,
    ...OPTS,
    signal: opts.signal,
  });
}

export async function gitFetch(
  cwd: string,
  branch: string,
  opts: CancelOpts = {},
): Promise<void> {
  await execFileP('git', ['fetch', 'origin', branch], {
    cwd,
    ...OPTS,
    signal: opts.signal,
  });
}

/**
 * Mergeability state reported by GitHub's `mergeStateStatus` field. We collapse
 * GitHub's full enum into the values the auto-merger reacts to.
 *
 * - 'CLEAN': PR can be merged immediately.
 * - 'DIRTY': branch has merge conflicts with base.
 * - 'BLOCKED' / 'BEHIND': waiting on required reviews/branch protection.
 * - 'UNSTABLE': mergeable but a check is failing or pending.
 * - 'HAS_HOOKS': mergeable, post-receive hook is enabled.
 * - 'UNKNOWN': GitHub hasn't computed it yet — poll again.
 */
export type PrMergeStateStatus =
  | 'CLEAN'
  | 'DIRTY'
  | 'BLOCKED'
  | 'BEHIND'
  | 'UNSTABLE'
  | 'HAS_HOOKS'
  | 'UNKNOWN';

export type PrMergeState = {
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  mergeStateStatus: PrMergeStateStatus;
};

export async function ghViewPrMergeState(args: {
  cwd: string;
  branch: string;
  signal?: AbortSignal;
}): Promise<PrMergeState | null> {
  try {
    const { stdout } = await execFileP(
      'gh',
      ['pr', 'view', args.branch, '--json', 'mergeable,mergeStateStatus'],
      { cwd: args.cwd, ...OPTS, signal: args.signal },
    );
    const parsed = JSON.parse(stdout) as {
      mergeable?: string;
      mergeStateStatus?: string;
    };
    const mergeable =
      parsed.mergeable === 'MERGEABLE' || parsed.mergeable === 'CONFLICTING'
        ? parsed.mergeable
        : 'UNKNOWN';
    const stateRaw = (parsed.mergeStateStatus ?? 'UNKNOWN').toUpperCase();
    const mergeStateStatus: PrMergeStateStatus =
      stateRaw === 'CLEAN' ||
      stateRaw === 'DIRTY' ||
      stateRaw === 'BLOCKED' ||
      stateRaw === 'BEHIND' ||
      stateRaw === 'UNSTABLE' ||
      stateRaw === 'HAS_HOOKS'
        ? (stateRaw as PrMergeStateStatus)
        : 'UNKNOWN';
    return { mergeable, mergeStateStatus };
  } catch {
    return null;
  }
}

export async function ghMergePrAuto(args: {
  cwd: string;
  branch: string;
  signal?: AbortSignal;
}): Promise<void> {
  await execFileP(
    'gh',
    ['pr', 'merge', args.branch, '--squash', '--auto', '--delete-branch'],
    { cwd: args.cwd, ...OPTS, signal: args.signal },
  );
}

export type CreatePrArgs = {
  cwd: string;
  title: string;
  body: string;
  baseBranch: string;
  draft?: boolean;
  signal?: AbortSignal;
};

const PR_URL_RE = /https:\/\/github\.com\/[^\s]+\/pull\/\d+/;

export async function ghCreatePr(args: CreatePrArgs): Promise<string> {
  const ghArgs = ['pr', 'create', '--title', args.title, '--body', args.body, '--base', args.baseBranch];
  if (args.draft) ghArgs.push('--draft');
  const { stdout } = await execFileP('gh', ghArgs, {
    cwd: args.cwd,
    ...OPTS,
    signal: args.signal,
  });
  const match = stdout.match(PR_URL_RE);
  if (!match) {
    throw new Error(`gh pr create did not return a PR URL. stdout: ${stdout.slice(0, 400)}`);
  }
  return match[0];
}

/**
 * Return the URL of the existing open PR for `branch`, or null. Used during
 * push-only resume to avoid "a pull request already exists" errors from
 * re-running ghCreatePr after an interrupted push/PR step.
 */
export async function ghFindPrForBranch(args: {
  cwd: string;
  branch: string;
  signal?: AbortSignal;
}): Promise<string | null> {
  try {
    const { stdout } = await execFileP(
      'gh',
      ['pr', 'list', '--head', args.branch, '--state', 'open', '--json', 'url', '--jq', '.[0].url // empty'],
      { cwd: args.cwd, ...OPTS, signal: args.signal },
    );
    const url = stdout.trim();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

export async function deleteStoryBranch(args: {
  repoPath: string;
  branch: string;
}): Promise<{ warning?: string }> {
  const { repoPath, branch } = args;
  const warnings: string[] = [];

  try {
    await execFileP('git', ['branch', '-D', branch], { cwd: repoPath, ...OPTS });
  } catch (err) {
    warnings.push(`local: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    await execFileP('git', ['push', 'origin', '--delete', branch], { cwd: repoPath, ...OPTS });
  } catch (err) {
    warnings.push(`remote: ${err instanceof Error ? err.message : String(err)}`);
  }

  return warnings.length > 0 ? { warning: warnings.join('; ') } : {};
}

export type SquashMergeArgs = {
  cwd: string;
  prUrl: string;
  subject: string;
  body?: string;
  signal?: AbortSignal;
};

/**
 * Squash-and-merge an existing PR via `gh pr merge --squash`. GitHub performs
 * the actual squash server-side, so the merge commit's subject is what the
 * caller passes here (e.g. `[#3]: Add widget`). Body is optional.
 */
export async function ghSquashMergePr(args: SquashMergeArgs): Promise<void> {
  const ghArgs = [
    'pr',
    'merge',
    args.prUrl,
    '--squash',
    '--subject',
    args.subject,
    '--body',
    args.body ?? '',
  ];
  await execFileP('gh', ghArgs, {
    cwd: args.cwd,
    ...OPTS,
    signal: args.signal,
  });
}

export type PrState = 'OPEN' | 'CLOSED' | 'MERGED';

export type PrStateInfo = {
  state: PrState;
  mergedAt: number | null;
};

/**
 * Look up the current state of an existing PR. Used by the renderer's Synchronize
 * action to detect PRs that were merged outside NightCoder (e.g. via the GitHub
 * UI) so the corresponding task can be moved to Done. Returns null when `gh`
 * can't answer — missing binary, bad URL, or network error — so callers can
 * treat "unknown" as a no-op rather than a failure.
 */
export async function ghGetPrState(args: {
  cwd: string;
  prUrl: string;
  signal?: AbortSignal;
}): Promise<PrStateInfo | null> {
  try {
    const { stdout } = await execFileP(
      'gh',
      ['pr', 'view', args.prUrl, '--json', 'state,mergedAt'],
      { cwd: args.cwd, ...OPTS, signal: args.signal },
    );
    const parsed = JSON.parse(stdout) as { state?: string; mergedAt?: string | null };
    const state = parsed.state;
    if (state !== 'OPEN' && state !== 'CLOSED' && state !== 'MERGED') return null;
    const mergedAtRaw = parsed.mergedAt;
    const mergedAt = mergedAtRaw ? Date.parse(mergedAtRaw) : null;
    return { state, mergedAt: Number.isFinite(mergedAt) ? mergedAt : null };
  } catch {
    return null;
  }
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
