import type { RefinedPlan, Story, StoryAgents } from './ipc';

export type AddStoryInput = {
  taskId: string;
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
  agents?: StoryAgents;
  /** Index of the blocking story in the current plan; null for no blocker. */
  blockingIndex: number | null;
  /** Free-form reason used to label the generated dependency. */
  blockingReason?: string;
};

/**
 * Pure helper that appends a new story to a RefinedPlan and, when a
 * `blockingIndex` is provided, adds a single `{ from: blockingIndex, to: newIndex }`
 * dependency. Existing stories and dependencies are preserved unchanged. An
 * invalid or out-of-range blockingIndex is silently dropped — the dialog
 * validates indexes, but we don't want to corrupt the plan if it ever slips.
 */
export function addStoryToPlan(plan: RefinedPlan, input: AddStoryInput): RefinedPlan {
  const stories = plan.stories;
  const newIndex = stories.length;
  const newStory: Story = {
    taskId: input.taskId,
    title: input.title,
    description: input.description,
    acceptanceCriteria: input.acceptance,
    affectedFiles: [],
    ...(input.model !== undefined ? { model: input.model } : {}),
    ...(input.agents !== undefined ? { agents: input.agents } : {}),
  };
  const nextStories = [...stories, newStory];
  const validBlocker = input.blockingIndex !== null
    && Number.isInteger(input.blockingIndex)
    && input.blockingIndex >= 0
    && input.blockingIndex < stories.length;
  const nextDeps = validBlocker
    ? [
      ...plan.dependencies,
      {
        from: input.blockingIndex as number,
        to: newIndex,
        reason: input.blockingReason ?? 'user: blocks this task',
      },
    ]
    : plan.dependencies;
  return { stories: nextStories, dependencies: nextDeps };
}
