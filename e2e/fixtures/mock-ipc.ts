import type { Page } from '@playwright/test';
import type {
  LoadedAppState,
  RefinedPlan,
  RunEvent,
  Story,
  StoryStatus,
  Usage,
} from '@nightcoder/shared-types/ipc';

/* ─── Public surface ───────────────────────────────────────────────── */

/**
 * What the test wants the mock IPC bridge to start with. Everything is
 * optional — leave a field undefined to get the default.
 */
export type MockIpcOptions = {
  /** Initial value returned by `loadState()`. Defaults to an unselected folder + empty plan. */
  initialState?: Partial<LoadedAppState>;
  /** Initial usage payload returned by `getUsage()`. Defaults to `null` (panel hidden). */
  usage?: Usage | null;
  /** Folder result returned the next time `pickFolder()` is invoked. */
  pickFolderResult?:
    | { kind: 'cancelled' }
    | { kind: 'selected'; path: string; isGitRepo: boolean; hasOrigin: boolean };
};

/**
 * Helpers exposed on `window.__NIGHTCODER_TEST__` after `installMockIpc()`.
 * Tests interact with them via `page.evaluate()`.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __NIGHTCODER_TEST__?: {
      /** Push a `RunEvent` into every renderer subscriber. */
      emitRunEvent: (event: RunEvent) => void;
      /** Push a usage update into every renderer subscriber. */
      emitUsage: (usage: Usage | null) => void;
      /** Update what `pickFolder()` will return on the next call. */
      setPickFolderResult: (
        r:
          | { kind: 'cancelled' }
          | { kind: 'selected'; path: string; isGitRepo: boolean; hasOrigin: boolean },
      ) => void;
      /**
       * Snapshot of the last `saveState()` call. Used by tests that want to
       * assert "the renderer persisted X" without coupling to debounce timing.
       */
      lastSavedState: unknown;
      /** Number of times each IPC method was called. */
      callCounts: Record<string, number>;
    };
  }
}

/**
 * Inject a fully-typed mock `window.nightcoder` API into every page in `page`.
 * Must be called before `page.goto(...)` so the script runs before React hydrates.
 */
export async function installMockIpc(page: Page, options: MockIpcOptions = {}): Promise<void> {
  const initial: Required<MockIpcOptions> = {
    initialState: options.initialState ?? {},
    usage: options.usage ?? null,
    pickFolderResult:
      options.pickFolderResult ?? {
        kind: 'selected',
        path: '/Users/test/repo',
        isGitRepo: true,
        hasOrigin: true,
      },
  };

  await page.addInitScript((init: Required<MockIpcOptions>) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    type Listener<T> = (value: T) => void;

    const runListeners = new Set<Listener<RunEvent>>();
    const usageListeners = new Set<Listener<Usage | null>>();

    const callCounts: Record<string, number> = {};
    const bump = (name: string): void => {
      callCounts[name] = (callCounts[name] ?? 0) + 1;
    };

    let pickFolderResult = init.pickFolderResult;
    let currentUsage: Usage | null = init.usage;
    let lastSavedState: unknown = null;

    const overrides = init.initialState as Partial<LoadedAppState>;
    const baseLoaded: LoadedAppState = {
      folder: overrides.folder ?? null,
      brief: overrides.brief ?? '',
      plan: overrides.plan ?? { stories: [], dependencies: [] },
      runtime: overrides.runtime ?? null,
    };

    // ── window.nightcoder mock ───────────────────────────────────────
    const api = {
      version: 'mock',

      pickFolder: async () => {
        bump('pickFolder');
        return pickFolderResult;
      },

      refine: async () => {
        bump('refine');
        return { kind: 'ok', plan: baseLoaded.plan ?? { stories: [], dependencies: [] } };
      },

      advise: async () => {
        bump('advise');
        return {
          kind: 'ok',
          review: { overall: 'mock', concerns: [], perStoryNotes: [], suggestedDependencies: [] },
        };
      },

      startRun: async () => {
        bump('startRun');
        return { kind: 'started', runId: 'mock-run-' + Date.now() };
      },

      runStory: async () => {
        bump('runStory');
        return { kind: 'ok' };
      },

      resumeTask: async () => {
        bump('resumeTask');
        return { kind: 'ok', runId: 'mock-resume-' + Date.now() };
      },

      cancelRun: async () => {
        bump('cancelRun');
      },

      onRunEvent: (handler: Listener<RunEvent>) => {
        bump('onRunEvent');
        runListeners.add(handler);
        return () => {
          runListeners.delete(handler);
        };
      },

      loadState: async () => {
        bump('loadState');
        return baseLoaded;
      },

      saveState: async (state: unknown) => {
        bump('saveState');
        lastSavedState = state;
      },

      removeStory: async () => {
        bump('removeStory');
        return { plan: baseLoaded.plan ?? { stories: [], dependencies: [] } };
      },

      getUsage: async () => {
        bump('getUsage');
        return currentUsage;
      },

      onUsageUpdate: (handler: Listener<Usage | null>) => {
        bump('onUsageUpdate');
        usageListeners.add(handler);
        return () => {
          usageListeners.delete(handler);
        };
      },

      openExternal: async () => {
        bump('openExternal');
      },

      pickFilesToAttach: async () => {
        bump('pickFilesToAttach');
        return { kind: 'cancelled' };
      },

      addTaskFiles: async () => {
        bump('addTaskFiles');
        return { kind: 'ok', files: [] };
      },

      listTaskFiles: async () => {
        bump('listTaskFiles');
        return { kind: 'ok', files: [] };
      },

      removeTaskFile: async () => {
        bump('removeTaskFile');
        return { kind: 'ok', files: [] };
      },

      getTaskDiff: async () => {
        bump('getTaskDiff');
        return { kind: 'empty', reason: 'no-branch' };
      },

      squashMergeTask: async () => {
        bump('squashMergeTask');
        return { kind: 'error', message: 'mock' };
      },

      syncTaskStates: async () => {
        bump('syncTaskStates');
        return { kind: 'ok', checked: 0, mergedCount: 0, updates: [] };
      },

      listRepoTree: async () => {
        bump('listRepoTree');
        return { kind: 'ok', tree: [] };
      },
    };

    (window as any).nightcoder = api;

    // ── Test driver hooks ───────────────────────────────────────────
    (window as any).__NIGHTCODER_TEST__ = {
      emitRunEvent: (event: RunEvent) => {
        runListeners.forEach((l) => l(event));
      },
      emitUsage: (usage: Usage | null) => {
        currentUsage = usage;
        usageListeners.forEach((l) => l(usage));
      },
      setPickFolderResult: (r: typeof pickFolderResult) => {
        pickFolderResult = r;
      },
      get lastSavedState() {
        return lastSavedState;
      },
      callCounts,
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, initial);
}

/* ─── Convenience builders ─────────────────────────────────────────── */

/**
 * Build a small `RefinedPlan` for tests. Each title becomes one pending story
 * with a stable taskId.
 */
export function buildPlan(stories: { title: string; description?: string }[]): RefinedPlan {
  return {
    stories: stories.map((s, i): Story => ({
      taskId: `task-${i + 1}`,
      title: s.title,
      description: s.description ?? `${s.title} description`,
      acceptanceCriteria: [],
      affectedFiles: [],
    })),
    dependencies: [],
  };
}

/** Convenience: emit a status RunEvent for a story. */
export async function emitStatus(
  page: Page,
  storyIndex: number,
  status: StoryStatus,
  runId = 'mock-run',
): Promise<void> {
  await page.evaluate(
    ({ storyIndex, status, runId }) => {
      window.__NIGHTCODER_TEST__?.emitRunEvent({
        kind: 'status',
        runId,
        storyIndex,
        status,
      });
    },
    { storyIndex, status, runId },
  );
}

/** Convenience: emit a log line RunEvent. */
export async function emitLog(
  page: Page,
  storyIndex: number,
  line: string,
  stream: 'stdout' | 'stderr' | 'info' = 'stdout',
  runId = 'mock-run',
): Promise<void> {
  await page.evaluate(
    ({ storyIndex, line, stream, runId }) => {
      window.__NIGHTCODER_TEST__?.emitRunEvent({
        kind: 'log',
        runId,
        storyIndex,
        stream,
        line,
      });
    },
    { storyIndex, line, stream, runId },
  );
}

/** Convenience: emit a `branch` RunEvent (sets the branch chip on the card). */
export async function emitBranch(
  page: Page,
  storyIndex: number,
  branch: string,
  runId = 'mock-run',
): Promise<void> {
  await page.evaluate(
    ({ storyIndex, branch, runId }) => {
      window.__NIGHTCODER_TEST__?.emitRunEvent({
        kind: 'branch',
        runId,
        storyIndex,
        branch,
      });
    },
    { storyIndex, branch, runId },
  );
}

/** Convenience: emit a `pr` RunEvent (sets the PR chip + branch on the card). */
export async function emitPr(
  page: Page,
  storyIndex: number,
  url: string,
  branch: string,
  runId = 'mock-run',
): Promise<void> {
  await page.evaluate(
    ({ storyIndex, url, branch, runId }) => {
      window.__NIGHTCODER_TEST__?.emitRunEvent({
        kind: 'pr',
        runId,
        storyIndex,
        url,
        branch,
      });
    },
    { storyIndex, url, branch, runId },
  );
}

/** Convenience: emit an `auto-merge` RunEvent (drives the auto-merge watcher state). */
export async function emitAutoMerge(
  page: Page,
  storyIndex: number,
  state: 'polling' | 'rebasing' | 'merged' | 'failed',
  message?: string,
  runId = 'mock-run',
): Promise<void> {
  await page.evaluate(
    ({ storyIndex, state, message, runId }) => {
      window.__NIGHTCODER_TEST__?.emitRunEvent({
        kind: 'auto-merge',
        runId,
        storyIndex,
        state,
        message,
      });
    },
    { storyIndex, state, message, runId },
  );
}

/** Read how many times an IPC method was called. */
export async function getCallCount(page: Page, method: string): Promise<number> {
  return page.evaluate(
    (method) => window.__NIGHTCODER_TEST__?.callCounts[method] ?? 0,
    method,
  );
}
