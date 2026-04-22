import type { Story } from '@zibby/shared-types/ipc';
import { executeStory, type StoryExecutionEvent } from './execute-story';
import { detectBaseBranch } from './worktree';

export type SingleStoryHandle = {
  result: Promise<{ success: boolean }>;
  cancel: () => void;
};

export function runSingleStory(args: {
  story: Story;
  storyIndex: number;
  repoPath: string;
  baseBranch?: string;
  onEvent: (event: { storyIndex: number } & StoryExecutionEvent) => void;
}): SingleStoryHandle {
  const signal = { cancelled: false };
  const usedSlugs = new Set<string>();

  const result = (async () => {
    const baseBranch = args.baseBranch ?? (await detectBaseBranch(args.repoPath));
    const res = await executeStory({
      story: args.story,
      storyIndex: args.storyIndex,
      repoPath: args.repoPath,
      baseBranch,
      usedSlugs,
      signal,
      onEvent: (e) => args.onEvent({ storyIndex: args.storyIndex, ...e }),
    });
    return { success: res.success };
  })();

  return {
    result,
    cancel: () => {
      signal.cancelled = true;
    },
  };
}
