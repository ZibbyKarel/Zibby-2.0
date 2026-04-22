import {
  JobStatus, SubtaskStatus, LogStream,
  CreateJobSchema, JobSchema, SubtaskSchema, SubtaskLogSchema,
  DecomposerOutputSchema,
} from '../index';

describe('shared-types', () => {
  it('JobStatus enum has expected values', () => {
    expect(JobStatus.PENDING).toBe('PENDING');
    expect(JobStatus.DECOMPOSING).toBe('DECOMPOSING');
    expect(JobStatus.RUNNING).toBe('RUNNING');
    expect(JobStatus.COMPLETED).toBe('COMPLETED');
    expect(JobStatus.PARTIALLY_COMPLETED).toBe('PARTIALLY_COMPLETED');
    expect(JobStatus.FAILED).toBe('FAILED');
  });

  it('SubtaskStatus enum has expected values', () => {
    expect(SubtaskStatus.QUEUED).toBe('QUEUED');
    expect(SubtaskStatus.RUNNING).toBe('RUNNING');
    expect(SubtaskStatus.PUSHING).toBe('PUSHING');
    expect(SubtaskStatus.PR_CREATED).toBe('PR_CREATED');
    expect(SubtaskStatus.FAILED).toBe('FAILED');
  });

  it('LogStream enum has expected values', () => {
    expect(LogStream.STDOUT).toBe('STDOUT');
    expect(LogStream.STDERR).toBe('STDERR');
    expect(LogStream.SYSTEM).toBe('SYSTEM');
  });

  it('CreateJobSchema validates a valid payload', () => {
    const result = CreateJobSchema.safeParse({ prompt: 'Add dark mode', directory: 'apps/web' });
    expect(result.success).toBe(true);
  });

  it('CreateJobSchema accepts an absolute directory path', () => {
    const result = CreateJobSchema.safeParse({ prompt: 'Add dark mode', directory: '/Users/test/another-repo/apps/web' });
    expect(result.success).toBe(true);
  });

  it('CreateJobSchema rejects empty prompt', () => {
    const result = CreateJobSchema.safeParse({ prompt: '', directory: 'apps/web' });
    expect(result.success).toBe(false);
  });

  it('CreateJobSchema rejects unsafe directory traversal', () => {
    const result = CreateJobSchema.safeParse({ prompt: 'Add dark mode', directory: '../secrets' });
    expect(result.success).toBe(false);
  });

  it('DecomposerOutputSchema validates subtask list', () => {
    const result = DecomposerOutputSchema.safeParse({
      subtasks: [
        {
          order: 1,
          title: 'Implement toggle button',
          spec: 'Add a DarkModeToggle component...',
          acceptanceCriteria: ['Toggle changes body class', 'State persists in localStorage'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('DecomposerOutputSchema rejects empty acceptanceCriteria', () => {
    const result = DecomposerOutputSchema.safeParse({
      subtasks: [{ order: 1, title: 'T', spec: 'S', acceptanceCriteria: [] }],
    });
    expect(result.success).toBe(false);
  });
});
