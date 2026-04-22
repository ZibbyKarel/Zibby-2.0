import { z } from 'zod';
import type { Story, Dependency, RefinedPlan } from './ipc';

export const StorySchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10),
  acceptanceCriteria: z.array(z.string().min(3)).min(1).max(12),
  affectedFiles: z.array(z.string()).max(40),
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
