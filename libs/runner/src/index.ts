export { runSubtask, parseStreamLine, detectSuccess } from './lib/claude-runner';
export { addWorktree, removeWorktree, hasNewCommits } from './lib/worktree';
export { buildSubtaskPrompt } from './lib/prompt-builder';
export type { RunnerConfig, RunnerEvent } from './lib/types';
export type { RunSubtaskOptions, SuccessCheckInput } from './lib/claude-runner';
