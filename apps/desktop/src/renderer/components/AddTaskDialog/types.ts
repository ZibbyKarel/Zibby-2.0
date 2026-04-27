import type { PhaseModels } from '@nightcoder/shared-types/ipc';

export type AddTaskFormValues = {
  title: string;
  description: string;
  acceptance: string;
  requiresHumanReview: boolean;
  phaseModels: PhaseModels;
  blockerTaskIds: string[];
  attachedFilePaths: string[];
};

export type NewTaskData = {
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
  attachedFilePaths: string[];
  phaseModels?: PhaseModels;
  /** All selected dependency task IDs. First entry (if any) is used as the branch parent. */
  blockerTaskIds?: string[];
  /**
   * When false, the orchestrator runs the task end-to-end: it auto-resolves any
   * rebase conflicts via the AI executor and auto-merges the PR once it is
   * mergeable. Defaults to true (the existing human-review flow).
   */
  requiresHumanReview: boolean;
};

export type BlockerOption = {
  taskId: string;
  title: string;
  /** Shown alongside the title so users can tell similarly-named tasks apart. */
  hint?: string;
};

export type PhaseKey = 'planning' | 'implementation' | 'qa';

export const TREE_STORAGE_KEY = 'nc.addTask.showTree';

export function readTreeStoragePref(): boolean {
  try {
    return localStorage.getItem(TREE_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}
