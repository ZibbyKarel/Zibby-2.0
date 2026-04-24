import { readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import type { FileTreeNode } from '@nightcoder/shared-types/ipc';

const DEFAULT_IGNORED = new Set<string>([
  '.git',
  'node_modules',
  '.worktrees',
  '.nightcoder',
  'dist',
  'dist-main',
  'dist-preload',
  'dist-renderer',
  'build',
  'coverage',
  '.turbo',
  '.next',
  '.cache',
  '.parcel-cache',
  '.vite',
  '.DS_Store',
  'out',
  'target',
  '.venv',
  'venv',
  '__pycache__',
]);

export type ReadRepoTreeOptions = {
  /** Max directory depth to descend (root = depth 0). */
  maxDepth?: number;
  /** Max total entries (files + dirs) to return before truncating. */
  maxEntries?: number;
  /** Extra directory / file basenames to skip (in addition to the defaults). */
  ignore?: Iterable<string>;
};

export type RepoTreeResult = {
  tree: FileTreeNode[];
  /** True when the walker stopped early because `maxEntries` was reached. */
  truncated: boolean;
};

const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_ENTRIES = 5000;

/**
 * Walk `repoPath` and return a nested file tree. Directories are listed before
 * files; entries within each group are sorted case-insensitively. Hidden and
 * build-artifact directories are skipped (see `DEFAULT_IGNORED`); callers can
 * extend the skip list via `options.ignore`.
 *
 * The walker intentionally does not follow symlinks (uses `lstat`) to avoid
 * cycles and walking out of the repo.
 */
export async function readRepoTree(
  repoPath: string,
  options: ReadRepoTreeOptions = {},
): Promise<RepoTreeResult> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const ignore = new Set([...DEFAULT_IGNORED, ...(options.ignore ?? [])]);

  const state = { count: 0, truncated: false };

  async function walk(dirPath: string, depth: number): Promise<FileTreeNode[]> {
    if (state.truncated) return [];
    let entries: string[];
    try {
      entries = await readdir(dirPath);
    } catch {
      return [];
    }
    const dirs: FileTreeNode[] = [];
    const files: FileTreeNode[] = [];
    const sorted = entries.slice().sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    for (const name of sorted) {
      if (state.count >= maxEntries) {
        state.truncated = true;
        break;
      }
      if (ignore.has(name)) continue;
      const full = path.join(dirPath, name);
      let info;
      try {
        info = await lstat(full);
      } catch {
        continue;
      }
      // Skip symlinks to keep the walk bounded (use lstat so targets aren't
      // resolved — a symlink to a real directory is still reported as a link).
      if (info.isSymbolicLink()) continue;
      state.count += 1;
      if (info.isDirectory()) {
        const children = depth + 1 <= maxDepth ? await walk(full, depth + 1) : [];
        dirs.push({ name, type: 'dir', children });
      } else if (info.isFile()) {
        files.push({ name, type: 'file' });
      }
    }
    return [...dirs, ...files];
  }

  const tree = await walk(repoPath, 0);
  return { tree, truncated: state.truncated };
}
