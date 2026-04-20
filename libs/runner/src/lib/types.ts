export interface RunnerConfig {
  repoPath: string;       // absolute path to the mounted repo root
  maxTurns: number;       // --max-turns for claude
  model: string;          // --model for claude
  baseBranch: string;     // e.g. "main", used to detect new commits
}

export type RunnerEvent =
  | { type: 'log'; stream: 'STDOUT' | 'STDERR'; line: string }
  | { type: 'system'; message: string }
  | { type: 'result_success'; summary: string }
  | { type: 'result_error'; error: string };
