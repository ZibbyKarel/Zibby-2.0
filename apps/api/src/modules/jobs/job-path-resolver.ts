import { execFile } from 'child_process';
import { stat } from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ResolvedJobPaths {
  repoPath: string;
  selectedPath: string;
  executionSubpath: string;
}

export async function resolveJobPaths(defaultRepoPath: string, directory: string): Promise<ResolvedJobPaths> {
  const selectedPath = path.isAbsolute(directory)
    ? path.resolve(directory)
    : path.resolve(defaultRepoPath, directory);

  const info = await stat(selectedPath).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(`Execution directory does not exist: ${directory}`);
  }

  const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
    cwd: selectedPath,
  }).catch(() => {
    throw new Error(`Execution directory is not inside a git repository: ${directory}`);
  });

  const repoPath = stdout.trim();
  const executionSubpath = path.relative(repoPath, selectedPath) || '.';

  if (executionSubpath.startsWith('..') || path.isAbsolute(executionSubpath)) {
    throw new Error(`Could not resolve execution path for directory: ${directory}`);
  }

  return { repoPath, selectedPath, executionSubpath };
}
