import type { Story } from '@nightcoder/shared-types/ipc';

/**
 * Build the squash-merge commit subject for a task. Prefers the project-scoped
 * numericId (what users see as `#3` in the UI); falls back to the taskId slug
 * for tasks that never ran and therefore have no numericId assigned.
 */
export function formatSquashCommitTitle(story: Story): string {
  const id = story.numericId != null ? `#${story.numericId}` : story.taskId;
  return `[${id}]: ${story.title}`;
}
