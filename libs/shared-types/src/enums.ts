export const JobStatus = {
  PENDING: 'PENDING',
  DECOMPOSING: 'DECOMPOSING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
  FAILED: 'FAILED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const SubtaskStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  PUSHING: 'PUSHING',
  PR_CREATED: 'PR_CREATED',
  FAILED: 'FAILED',
} as const;
export type SubtaskStatus = (typeof SubtaskStatus)[keyof typeof SubtaskStatus];

export const LogStream = {
  STDOUT: 'STDOUT',
  STDERR: 'STDERR',
  SYSTEM: 'SYSTEM',
} as const;
export type LogStream = (typeof LogStream)[keyof typeof LogStream];
