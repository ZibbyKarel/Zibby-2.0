type Transitions = Record<string, string[]>;

const JOB_TRANSITIONS: Transitions = {
  PENDING: ['DECOMPOSING'],
  DECOMPOSING: ['RUNNING', 'FAILED'],
  RUNNING: ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'],
};

const SUBTASK_TRANSITIONS: Transitions = {
  QUEUED: ['RUNNING', 'FAILED'],
  RUNNING: ['PUSHING', 'FAILED'],
  PUSHING: ['PR_CREATED', 'FAILED'],
};

export function isValidJobTransition(from: string, to: string): boolean {
  return JOB_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidSubtaskTransition(from: string, to: string): boolean {
  return SUBTASK_TRANSITIONS[from]?.includes(to) ?? false;
}
