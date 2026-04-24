import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { access } from 'node:fs/promises';
import type { TaskDiffFile } from '@nightcoder/shared-types/ipc';
import { detectBaseBranch } from './worktree';

const execFileP = promisify(execFile);
const OPTS = { maxBuffer: 64 * 1024 * 1024 } as const;

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function branchExists(repoPath: string, branch: string): Promise<boolean> {
  try {
    await execFileP('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], {
      cwd: repoPath,
      ...OPTS,
    });
    return true;
  } catch {
    return false;
  }
}

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  md: 'markdown',
  mdx: 'markdown',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  html: 'html',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  sql: 'sql',
  vue: 'vue',
  svelte: 'svelte',
};

function langFromPath(p: string | null): string | null {
  if (!p) return null;
  const dot = p.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = p.slice(dot + 1).toLowerCase();
  return EXT_TO_LANG[ext] ?? null;
}

/**
 * Split a multi-file unified diff into per-file entries. The git output looks
 * like a sequence of `diff --git a/<old> b/<new>` blocks followed by optional
 * mode/index/rename headers, `--- / +++` path lines, and one or more `@@` hunks.
 *
 * Binary files (`Binary files ... differ`) become entries with changeKind
 * `'binary'` and no hunks.
 */
export function parseUnifiedDiff(raw: string): TaskDiffFile[] {
  if (!raw.trim()) return [];
  const lines = raw.split('\n');
  const files: TaskDiffFile[] = [];

  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith('diff --git ')) {
      i++;
      continue;
    }
    const header = lines[i];
    const headerMatch = header.match(/^diff --git a\/(.+?) b\/(.+)$/);
    let oldPath: string | null = headerMatch?.[1] ?? null;
    let newPath: string | null = headerMatch?.[2] ?? null;
    let changeKind: TaskDiffFile['changeKind'] = 'modified';
    let isBinary = false;
    const hunks: string[] = [];
    i++;

    // Consume preamble until first hunk or next diff.
    while (i < lines.length && !lines[i].startsWith('diff --git ') && !lines[i].startsWith('@@')) {
      const line = lines[i];
      if (line.startsWith('new file mode')) changeKind = 'added';
      else if (line.startsWith('deleted file mode')) changeKind = 'deleted';
      else if (line.startsWith('rename from') || line.startsWith('rename to')) changeKind = 'renamed';
      else if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
        isBinary = true;
      } else if (line.startsWith('--- ')) {
        const v = line.slice(4).trim();
        if (v === '/dev/null') oldPath = null;
        else if (v.startsWith('a/')) oldPath = v.slice(2);
      } else if (line.startsWith('+++ ')) {
        const v = line.slice(4).trim();
        if (v === '/dev/null') newPath = null;
        else if (v.startsWith('b/')) newPath = v.slice(2);
      }
      i++;
    }

    // Consume hunks — each @@ block up to next @@ or next diff.
    while (i < lines.length && lines[i].startsWith('@@')) {
      const hunkStart = i;
      i++;
      while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git ')) {
        i++;
      }
      const body = lines.slice(hunkStart, i);
      // Drop the trailing empty line that `split('\n')` introduces when the
      // input ends with a newline — otherwise every hunk gets an extra blank.
      if (body.length > 0 && body[body.length - 1] === '' && i === lines.length) {
        body.pop();
      }
      hunks.push(body.join('\n'));
    }

    if (isBinary && changeKind === 'modified') changeKind = 'binary';
    if (isBinary) {
      files.push({ oldPath, newPath, changeKind: 'binary', lang: null, hunks: [] });
    } else {
      const refPath = newPath ?? oldPath;
      files.push({
        oldPath,
        newPath,
        changeKind,
        lang: langFromPath(refPath),
        hunks,
      });
    }
  }

  return files;
}

export type GetTaskDiffArgs = {
  repoPath: string;
  /** Current branch name for this task, e.g. `nightcoder/<slug>`. */
  branch: string | null;
  /** Optional override for the base branch (defaults to auto-detect). */
  baseBranch?: string;
};

export type GetTaskDiffOutcome =
  | { kind: 'ok'; baseBranch: string; branch: string | null; files: TaskDiffFile[] }
  | { kind: 'empty'; reason: 'no-branch' | 'no-changes' }
  | { kind: 'error'; message: string };

/**
 * Produce the unified diff for a task's branch relative to the detected base
 * branch. Prefers the task's worktree (includes uncommitted in-flight changes)
 * and falls back to the bare branch once the worktree has been cleaned up.
 */
export async function getTaskDiff(args: GetTaskDiffArgs): Promise<GetTaskDiffOutcome> {
  const { repoPath } = args;
  try {
    const baseBranch = args.baseBranch ?? (await detectBaseBranch(repoPath));

    const worktreePath = args.branch
      ? path.join(repoPath, '.worktrees', args.branch.replace(/^nightcoder\//, ''))
      : null;

    let diffCwd = repoPath;
    let diffRange: string[];
    if (worktreePath && (await exists(worktreePath))) {
      // Diffs worktree (incl. uncommitted) against the base branch.
      diffCwd = worktreePath;
      diffRange = [baseBranch];
    } else if (args.branch && (await branchExists(repoPath, args.branch))) {
      // Compares tip of branch to merge-base with base branch.
      diffRange = [`${baseBranch}...${args.branch}`];
    } else {
      return { kind: 'empty', reason: 'no-branch' };
    }

    const { stdout } = await execFileP(
      'git',
      ['diff', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', ...diffRange],
      { cwd: diffCwd, ...OPTS },
    );

    if (!stdout.trim()) return { kind: 'empty', reason: 'no-changes' };

    const files = parseUnifiedDiff(stdout);
    if (files.length === 0) return { kind: 'empty', reason: 'no-changes' };

    return { kind: 'ok', baseBranch, branch: args.branch, files };
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}
