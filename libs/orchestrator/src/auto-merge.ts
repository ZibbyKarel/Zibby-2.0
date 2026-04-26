import type { Story } from '@nightcoder/shared-types/ipc';
import {
  ghMergePrAuto,
  ghViewPrMergeState,
  gitForcePushWithLease,
  type PrMergeStateStatus,
} from '@nightcoder/github';
import { resolveConflicts, type ResolveConflictsArgs } from './conflict-resolver';

const DEFAULT_POLL_MS = (() => {
  const raw = Number.parseInt(process.env.NIGHTCODER_AUTO_MERGE_POLL_MS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 15_000;
})();
const DEFAULT_MAX_WAIT_MS = 60 * 60_000;

export type AutoMergeEvent =
  | { kind: 'log'; stream: 'info' | 'stderr'; line: string }
  | { kind: 'mergeability'; state: PrMergeStateStatus }
  | { kind: 'merged' }
  | { kind: 'failed'; message: string };

export type AutoMergeHandle = {
  /** Resolves once the watcher has stopped (merged, failed, or cancelled). */
  done: Promise<void>;
  stop: () => void;
};

export type StartAutoMergeArgs = {
  worktreePath: string;
  branch: string;
  baseBranch: string;
  story: Story;
  model?: string;
  signal: { cancelled: boolean };
  onEvent: (event: AutoMergeEvent) => void;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  /** Injected for tests; defaults to the real `resolveConflicts`. */
  resolver?: (args: ResolveConflictsArgs) => ReturnType<typeof resolveConflicts>;
  /** Injected for tests; defaults to the real `ghViewPrMergeState`. */
  viewMergeState?: typeof ghViewPrMergeState;
  /** Injected for tests; defaults to the real `ghMergePrAuto`. */
  mergePr?: typeof ghMergePrAuto;
  /** Injected for tests; defaults to the real `gitForcePushWithLease`. */
  forcePush?: typeof gitForcePushWithLease;
};

/**
 * Spawn a background watcher that polls the PR's mergeability and:
 *   - calls `gh pr merge --auto --squash` once it is CLEAN,
 *   - re-runs the AI conflict resolver + force-push-with-lease when it is DIRTY,
 *   - keeps polling while it is BLOCKED/UNSTABLE/UNKNOWN waiting on CI/reviews.
 * Honours both `args.signal.cancelled` and the returned `stop()`.
 */
export function startAutoMerge(args: StartAutoMergeArgs): AutoMergeHandle {
  const pollIntervalMs = args.pollIntervalMs ?? DEFAULT_POLL_MS;
  const maxWaitMs = args.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const resolver = args.resolver ?? resolveConflicts;
  const viewMergeState = args.viewMergeState ?? ghViewPrMergeState;
  const mergePr = args.mergePr ?? ghMergePrAuto;
  const forcePush = args.forcePush ?? gitForcePushWithLease;

  let stopped = false;
  const start = Date.now();

  const log = (line: string, stream: 'info' | 'stderr' = 'info') =>
    args.onEvent({ kind: 'log', stream, line });

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = setTimeout(() => {
        clearInterval(watchId);
        resolve();
      }, ms);
      const watchId = setInterval(() => {
        if (stopped || args.signal.cancelled) {
          clearTimeout(id);
          clearInterval(watchId);
          resolve();
        }
      }, 250);
    });

  const done = (async () => {
    while (!stopped && !args.signal.cancelled) {
      if (Date.now() - start > maxWaitMs) {
        const message = `auto-merge timed out after ${maxWaitMs}ms`;
        log(message, 'stderr');
        args.onEvent({ kind: 'failed', message });
        return;
      }

      const state = await viewMergeState({ cwd: args.worktreePath, branch: args.branch });
      if (stopped || args.signal.cancelled) return;

      if (!state) {
        log('mergeability lookup returned null — retrying', 'stderr');
        await sleep(pollIntervalMs);
        continue;
      }

      args.onEvent({ kind: 'mergeability', state: state.mergeStateStatus });
      log(`pr mergeability: ${state.mergeStateStatus} (mergeable=${state.mergeable})`);

      if (state.mergeStateStatus === 'CLEAN' || state.mergeStateStatus === 'HAS_HOOKS') {
        try {
          await mergePr({ cwd: args.worktreePath, branch: args.branch });
          args.onEvent({ kind: 'merged' });
          return;
        } catch (err) {
          const message = `gh pr merge failed: ${errMessage(err)}`;
          log(message, 'stderr');
          args.onEvent({ kind: 'failed', message });
          return;
        }
      }

      if (state.mergeStateStatus === 'DIRTY' || state.mergeable === 'CONFLICTING') {
        log('pr is conflicting — re-running AI conflict resolver');
        const r = await resolver({
          worktreePath: args.worktreePath,
          baseBranch: args.baseBranch,
          story: args.story,
          model: args.model,
          signal: args.signal,
          onEvent: (e) => {
            if (e.kind === 'log') args.onEvent({ kind: 'log', stream: e.stream === 'stdout' ? 'info' : e.stream, line: e.line });
          },
        });
        if (stopped || args.signal.cancelled) return;
        if (r.kind === 'failed') {
          const message = `auto-resolve failed: ${r.message}`;
          log(message, 'stderr');
          args.onEvent({ kind: 'failed', message });
          return;
        }
        if (r.kind === 'resolved') {
          try {
            await forcePush(args.worktreePath, args.branch);
            log(`force-pushed (with-lease) ${args.branch} after AI resolve`);
          } catch (err) {
            const message = `force-push failed: ${errMessage(err)}`;
            log(message, 'stderr');
            args.onEvent({ kind: 'failed', message });
            return;
          }
        }
        await sleep(pollIntervalMs);
        continue;
      }

      // BLOCKED / BEHIND / UNSTABLE / UNKNOWN — keep waiting.
      await sleep(pollIntervalMs);
    }

    if (args.signal.cancelled) {
      log('auto-merge cancelled');
    }
  })();

  return {
    done,
    stop: () => {
      stopped = true;
    },
  };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
