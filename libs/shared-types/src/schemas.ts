import { z } from 'zod';

const WindowsAbsolutePathPattern = /^[A-Za-z]:[\\/]/;

const DirectorySchema = z
  .string()
  .trim()
  .min(1, 'Directory must not be empty')
  .refine((value) => {
    if (value.includes('\0')) return false;

    const segments = value.split(/[\\/]+/).filter(Boolean);
    const isAbsolute = value.startsWith('/') || WindowsAbsolutePathPattern.test(value);

    if (isAbsolute) return true;

    return value === '.' || !segments.includes('..');
  }, {
    message: 'Directory must be an absolute path or a safe relative path',
  });

export const CreateJobSchema = z.object({
  prompt: z.string().min(1, 'Prompt must not be empty'),
  directory: DirectorySchema,
});
export type CreateJobDto = z.infer<typeof CreateJobSchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  order: z.number(),
  title: z.string(),
  spec: z.string(),
  acceptanceCriteria: z.string(), // JSON-encoded string[]
  status: z.string(),
  branch: z.string().nullable(),
  prUrl: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});
export type SubtaskDto = z.infer<typeof SubtaskSchema>;

export const JobSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  directory: DirectorySchema,
  status: z.string(),
  error: z.string().nullable(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
  subtasks: z.array(SubtaskSchema).optional(),
});
export type JobDto = z.infer<typeof JobSchema>;

export const SubtaskLogSchema = z.object({
  id: z.string(),
  subtaskId: z.string(),
  ts: z.string(),
  stream: z.string(),
  line: z.string(),
});
export type SubtaskLogDto = z.infer<typeof SubtaskLogSchema>;

// Used by decomposer service to validate Anthropic API structured output
export const DecomposerSubtaskSchema = z.object({
  order: z.number().int().positive(),
  title: z.string().min(1),
  spec: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(2, 'At least two acceptance criteria required'),
});

export const DecomposerOutputSchema = z.object({
  subtasks: z.array(DecomposerSubtaskSchema).min(1).max(10),
});
export type DecomposerOutput = z.infer<typeof DecomposerOutputSchema>;
