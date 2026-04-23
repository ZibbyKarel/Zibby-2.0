import { z } from 'zod';
import type { Story, Dependency, RefinedPlan, AdvisorReview, RemoveStoryPayload, PersistedStoryRuntime } from './ipc';

export const StorySchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10),
  acceptanceCriteria: z.array(z.string().min(3)).min(1).max(12),
  affectedFiles: z.array(z.string()).max(40),
  model: z.string().optional(),
}) satisfies z.ZodType<Story>;

export const DependencySchema = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  reason: z.string().min(3),
}) satisfies z.ZodType<Dependency>;

export const RefinedPlanSchema = z.object({
  stories: z.array(StorySchema).min(1).max(10),
  dependencies: z.array(DependencySchema),
}) satisfies z.ZodType<RefinedPlan>;

export const RemoveStoryPayloadSchema = z.object({
  storyIndex: z.number().int().min(0),
}) satisfies z.ZodType<RemoveStoryPayload>;

const PersistedStorySchema = z.object({
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()).default([]),
  affectedFiles: z.array(z.string()).default([]),
  model: z.string().optional(),
});

const PersistedDependencySchema = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  reason: z.string().default(''),
});

export const PersistedPlanSchema = z.object({
  stories: z.array(PersistedStorySchema).default([]),
  dependencies: z.array(PersistedDependencySchema).default([]),
});

export const PersistedStoryRuntimeSchema = z.object({
  status: z.enum(['pending', 'blocked', 'running', 'pushing', 'done', 'failed', 'cancelled']),
  branch: z.string().nullable(),
  prUrl: z.string().nullable(),
  startedAt: z.number().nullable(),
  endedAt: z.number().nullable(),
}) satisfies z.ZodType<PersistedStoryRuntime>;

export const PersistedRuntimeSchema = z.record(
  z.coerce.number(),
  PersistedStoryRuntimeSchema,
);

export const AdvisorReviewSchema = z.object({
  overall: z.string().min(1),
  concerns: z.array(z.string().min(1)),
  perStoryNotes: z.array(
    z.object({
      storyIndex: z.number().int().min(0),
      note: z.string().min(1),
    })
  ),
  suggestedDependencies: z.array(DependencySchema),
}) satisfies z.ZodType<AdvisorReview>;
