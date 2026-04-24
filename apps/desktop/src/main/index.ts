import { app, BrowserWindow, dialog, ipcMain, shell, type WebContents } from 'electron';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  IpcChannels,
  IpcEvents,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
  type AdviseRequest,
  type AdviseResult,
  type RunStartRequest,
  type RunStartResult,
  type RunStoryRequest,
  type RunStoryResult,
  type ResumeTaskRequest,
  type ResumeTaskResult,
  type RunEvent,
  type PersistedState,
  type LoadedAppState,
  type RemoveStoryPayload,
  type RemoveStoryResult,
  type StoryStatus,
  type PickFilesToAttachResult,
  type AddTaskFilesRequest,
  type AddTaskFilesResult,
  type ListTaskFilesRequest,
  type ListTaskFilesResult,
  type RemoveTaskFileRequest,
  type RemoveTaskFileResult,
  type GetTaskDiffRequest,
  type TaskDiffResult,
  type SquashMergeTaskRequest,
  type SquashMergeTaskResult,
} from '@nightcoder/shared-types/ipc';
import type { Usage } from '@nightcoder/shared-types/ipc';
import { refine, advise } from '@nightcoder/ai-refiner';
import { buildResumePrompt, formatSquashCommitTitle, getTaskDiff, removeWorktreeForBranch, runSingleStory, runStoryResume, startPlanRun, removeStoryFromPlan, type PlanRunHandle } from '@nightcoder/orchestrator';
import { slugify } from '@nightcoder/shared-types/task-id';
import { deleteStoryBranch, ghSquashMergePr } from '@nightcoder/github';
import { fetchUsage } from '@nightcoder/usage';
import {
  archiveDroppedTaskFolders,
  copyTaskFiles,
  initProject,
  listTaskFiles,
  loadProject,
  mergePlanOnReplan,
  readJournalTail,
  readPlanMd,
  removeTaskFile,
  runtimeToTasks,
  saveProject,
  tasksToRuntime,
  updatePlan,
  updateTask,
} from '@nightcoder/project-state';
import { loadUserData, saveUserData, migrateLegacyIfNeeded } from './state-store';

const execFileP = promisify(execFile);
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(DEV_URL);

const MAX_PARALLEL_RUNNERS = Math.max(1, Number(process.env.MAX_PARALLEL_RUNNERS ?? 3));
let activeRunnerCount = 0;
const runnerQueue: Array<() => void> = [];

function acquireRunner(): Promise<void> {
  if (activeRunnerCount < MAX_PARALLEL_RUNNERS) {
    activeRunnerCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    runnerQueue.push(() => {
      activeRunnerCount++;
      resolve();
    });
  });
}

function releaseRunner(): void {
  activeRunnerCount--;
  const next = runnerQueue.shift();
  if (next) next();
}

const activeRuns = new Map<string, PlanRunHandle>();

// ── Auto-resume scheduling for tasks paused by a usage limit ──────────────
const RESUME_GRACE_MS = 5_000;
const RESUME_POLL_MS = 60_000;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let resumeTimerTarget: number | null = null;

function clearResumeTimer(): void {
  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
    resumeTimerTarget = null;
  }
}

function scheduleResumeAt(
  resetsAt: number | null | undefined,
  getWebContents: () => WebContents | null,
): void {
  const now = Date.now();
  const fallback = now + RESUME_POLL_MS;
  // When the CLI output doesn't include a timestamp, fall back to whatever
  // the Usage panel is already tracking — it's the same source of truth the
  // user sees in the header.
  const usageReset = cachedUsage?.fiveHour?.resetsAt ?? cachedUsage?.sevenDay?.resetsAt ?? null;
  const effective = resetsAt && Number.isFinite(resetsAt)
    ? resetsAt
    : (usageReset && usageReset > now ? usageReset : null);
  const target = effective ? effective + RESUME_GRACE_MS : fallback;
  // Keep the earliest scheduled wake-up; later limit-hits with a later reset
  // don't push the timer out.
  if (resumeTimerTarget !== null && resumeTimerTarget <= target) return;
  clearResumeTimer();
  const delay = Math.max(1_000, target - now);
  resumeTimerTarget = target;
  resumeTimer = setTimeout(() => {
    resumeTimer = null;
    resumeTimerTarget = null;
    void resumeInterruptedTasks(getWebContents).catch(() => {
      // On failure, try again after the poll interval so we don't give up.
      scheduleResumeAt(null, getWebContents);
    });
  }, delay);
}

/**
 * Find every task with status='interrupted' in the currently opened project
 * and kick off a Resume IPC-style flow for each. Limit has reset by the time
 * this fires; the existing runner serialization throttles concurrency.
 */
async function resumeInterruptedTasks(getWebContents: () => WebContents | null): Promise<void> {
  const userData = await loadUserData(app.getPath('userData'));
  const folderPath = userData.lastOpenedFolder;
  if (!folderPath) return;
  const project = await loadProject(folderPath);
  if (!project) return;

  const interruptedIds = Object.values(project.tasks)
    .filter((t) => t.status === 'interrupted')
    .map((t) => t.taskId);
  if (interruptedIds.length === 0) return;

  const wc = getWebContents();
  for (const taskId of interruptedIds) {
    const storyIndex = project.plan.stories.findIndex((s) => s.taskId === taskId);
    if (storyIndex < 0) continue;
    const story = project.plan.stories[storyIndex];
    const task = project.tasks[taskId];
    const branch = task?.branch ?? `nightcoder/${slugify(`${story.numericId ?? storyIndex + 1}-${story.title}`)}`;
    const pushOnly = task?.status === 'pushing';

    const [plan, journalTail, attachedFiles] = await Promise.all([
      readPlanMd(folderPath, taskId),
      readJournalTail(folderPath, taskId),
      listTaskFiles(folderPath, taskId),
    ]);
    const prompt = buildResumePrompt({
      story,
      plan,
      journalTail,
      attachedFileNames: attachedFiles.map((f) => f.name),
    });
    const runId = `auto-resume-${Date.now()}-${taskId}`;

    await acquireRunner();
    const handle = runStoryResume({
      story,
      storyIndex,
      repoPath: folderPath,
      resume: { branch, prompt, pushOnly },
      onEvent: (e) => {
        const liveWc = getWebContents();
        if (e.kind === 'status') {
          void persistStoryStatus(folderPath, taskId, e.status);
          if (liveWc) emitToRenderer(liveWc, { runId, storyIndex: e.storyIndex, kind: 'status', status: e.status });
        } else if (e.kind === 'log') {
          if (liveWc) emitToRenderer(liveWc, { runId, storyIndex: e.storyIndex, kind: 'log', stream: e.stream, line: e.line });
        } else if (e.kind === 'branch') {
          void persistStoryBranch(folderPath, taskId, e.branch);
          if (liveWc) emitToRenderer(liveWc, { runId, storyIndex: e.storyIndex, kind: 'branch', branch: e.branch });
        } else if (e.kind === 'pr') {
          void persistStoryPr(folderPath, taskId, e.branch, e.url);
          if (liveWc) emitToRenderer(liveWc, { runId, storyIndex: e.storyIndex, kind: 'pr', url: e.url, branch: e.branch });
        } else if (e.kind === 'limit-hit') {
          void persistStoryLimitHit(folderPath, taskId, e.resetsAt);
          scheduleResumeAt(e.resetsAt, getWebContents);
          if (liveWc) emitToRenderer(liveWc, { runId, storyIndex: e.storyIndex, kind: 'limit-hit', resetsAt: e.resetsAt });
        }
      },
    });
    void handle.result
      .catch((err) => {
        const liveWc = getWebContents();
        if (!liveWc) return;
        emitToRenderer(liveWc, {
          runId,
          storyIndex,
          kind: 'log',
          stream: 'stderr',
          line: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => releaseRunner());
  }

  if (wc && !wc.isDestroyed()) {
    wc.send(IpcEvents.RunEvent, {
      runId: `auto-resume-batch-${Date.now()}`,
      kind: 'run-done',
      success: true,
    });
  }
}

const USAGE_POLL_INTERVAL_MS = 5 * 60 * 1000;
let cachedUsage: Usage | null = null;
let usagePollTimer: ReturnType<typeof setInterval> | null = null;
let usageResetTimer: ReturnType<typeof setTimeout> | null = null;
let usageInFlight: Promise<Usage | null> | null = null;

function scheduleResetRefetch(getWebContents: () => WebContents | null, usage: Usage): void {
  if (usageResetTimer) {
    clearTimeout(usageResetTimer);
    usageResetTimer = null;
  }
  const now = Date.now();
  const futureTimes = [usage.fiveHour?.resetsAt, usage.sevenDay?.resetsAt]
    .filter((t): t is number => typeof t === 'number' && t > now);
  if (futureTimes.length === 0) return;
  const delay = Math.min(...futureTimes) - now;
  usageResetTimer = setTimeout(() => {
    usageResetTimer = null;
    void refreshUsage(getWebContents);
  }, delay);
}

async function refreshUsage(getWebContents: () => WebContents | null): Promise<Usage | null> {
  if (usageInFlight) return usageInFlight;
  usageInFlight = (async () => {
    try {
      const usage = await fetchUsage();
      cachedUsage = usage;
      if (usage) scheduleResetRefetch(getWebContents, usage);
      const wc = getWebContents();
      if (wc && !wc.isDestroyed()) wc.send(IpcEvents.UsageUpdate, usage);
      return usage;
    } catch {
      return cachedUsage;
    } finally {
      usageInFlight = null;
    }
  })();
  return usageInFlight;
}

function startUsagePolling(getWebContents: () => WebContents | null) {
  if (usagePollTimer) return;
  void refreshUsage(getWebContents);
  usagePollTimer = setInterval(() => {
    void refreshUsage(getWebContents);
  }, USAGE_POLL_INTERVAL_MS);
}

async function isGitRepo(folder: string): Promise<boolean> {
  try {
    await access(path.join(folder, '.git'));
    return true;
  } catch {
    return false;
  }
}

async function hasGitOrigin(folder: string): Promise<boolean> {
  try {
    const { stdout } = await execFileP('git', ['remote', 'get-url', 'origin'], { cwd: folder });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function emitToRenderer(wc: WebContents, event: RunEvent) {
  if (!wc.isDestroyed()) wc.send(IpcEvents.RunEvent, event);
}

const TERMINAL_STATUSES: ReadonlySet<StoryStatus> = new Set(['review', 'done', 'failed', 'cancelled']);

async function persistStoryStatus(
  repoPath: string,
  taskId: string,
  status: StoryStatus,
): Promise<void> {
  const patch: Parameters<typeof updateTask>[2] = { status };
  const now = Date.now();
  if (status === 'running') patch.startedAt = now;
  if (TERMINAL_STATUSES.has(status)) patch.endedAt = now;
  // When a task leaves the interrupted state (resumed or restarted), clear
  // the stored reset time so we don't auto-resume it a second time.
  if (status !== 'interrupted') patch.limitResetsAt = null;
  try {
    await updateTask(repoPath, taskId, patch);
  } catch {
    // Persistence failures never crash the run — the UI still sees the event.
  }
}

async function persistStoryLimitHit(
  repoPath: string,
  taskId: string,
  resetsAt: number | null,
): Promise<void> {
  try {
    await updateTask(repoPath, taskId, { limitResetsAt: resetsAt });
  } catch {
    // ignore
  }
}

async function persistStoryPr(repoPath: string, taskId: string, branch: string, url: string): Promise<void> {
  try {
    await updateTask(repoPath, taskId, { branch, prUrl: url });
  } catch {
    // ignore
  }
}

async function persistStoryBranch(repoPath: string, taskId: string, branch: string): Promise<void> {
  try {
    await updateTask(repoPath, taskId, { branch });
  } catch {
    // ignore
  }
}

function registerIpc(getWebContents: () => WebContents | null) {
  ipcMain.handle(IpcChannels.PickFolder, async (): Promise<PickFolderResult> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select a folder',
    });
    if (result.canceled || result.filePaths.length === 0) return { kind: 'cancelled' };
    const folder = result.filePaths[0];
    const gitRepo = await isGitRepo(folder);
    const origin = gitRepo ? await hasGitOrigin(folder) : false;
    await initProject(folder).catch(() => {
      // Non-fatal — the user can still refine; persistence simply falls back to a no-op.
    });
    await saveUserData(app.getPath('userData'), { lastOpenedFolder: folder }).catch(() => {});
    return { kind: 'selected', path: folder, isGitRepo: gitRepo, hasOrigin: origin };
  });

  ipcMain.handle(
    IpcChannels.Refine,
    async (_event, req: RefineRequest): Promise<RefineResult> => {
      try {
        const plan = await refine({ folderPath: req.folderPath, brief: req.brief });
        return { kind: 'ok', plan };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.Advise,
    async (_event, req: AdviseRequest): Promise<AdviseResult> => {
      try {
        const review = await advise({ folderPath: req.folderPath, plan: req.plan });
        return { kind: 'ok', review };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.StartRun,
    async (_event, req: RunStartRequest): Promise<RunStartResult> => {
      try {
        const stampedPlan = await updatePlan(req.folderPath, req.plan).catch(() => req.plan);
        const taskIdFor = (idx: number): string | undefined => stampedPlan.stories[idx]?.taskId;
        const handle = startPlanRun({
          plan: stampedPlan,
          repoPath: req.folderPath,
          baseBranch: req.baseBranch,
          completedIndices: req.completedIndices,
          onEvent: (e) => {
            const wc = getWebContents();
            if ('storyIndex' in e) {
              const tid = taskIdFor(e.storyIndex);
              if (e.kind === 'status') {
                if (tid) void persistStoryStatus(req.folderPath, tid, e.status);
                if (wc) emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'status',
                  status: e.status,
                });
              } else if (e.kind === 'log') {
                if (wc) emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'log',
                  stream: e.stream,
                  line: e.line,
                });
              } else if (e.kind === 'branch') {
                if (tid) void persistStoryBranch(req.folderPath, tid, e.branch);
                if (wc) emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'branch',
                  branch: e.branch,
                });
              } else if (e.kind === 'pr') {
                if (tid) void persistStoryPr(req.folderPath, tid, e.branch, e.url);
                if (wc) emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'pr',
                  url: e.url,
                  branch: e.branch,
                });
              } else if (e.kind === 'limit-hit') {
                if (tid) void persistStoryLimitHit(req.folderPath, tid, e.resetsAt);
                scheduleResumeAt(e.resetsAt, getWebContents);
                if (wc) emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'limit-hit',
                  resetsAt: e.resetsAt,
                });
              }
            } else if (e.kind === 'run-done') {
              if (wc) emitToRenderer(wc, { runId: handle.runId, kind: 'run-done', success: e.success });
              activeRuns.delete(handle.runId);
            }
          },
        });
        activeRuns.set(handle.runId, handle);
        return { kind: 'started', runId: handle.runId };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.RunStory,
    async (_event, req: RunStoryRequest): Promise<RunStoryResult> => {
      const story = req.plan.stories[req.storyIndex];
      if (!story) return { kind: 'error', message: `Story ${req.storyIndex} not found in plan` };
      await acquireRunner();
      const taskId = story.taskId;
      const handle = runSingleStory({
        story,
        storyIndex: req.storyIndex,
        repoPath: req.folderPath,
        baseBranch: req.baseBranch,
        onEvent: (e) => {
          const wc = getWebContents();
          if (e.kind === 'status') {
            if (taskId) void persistStoryStatus(req.folderPath, taskId, e.status);
            if (wc) emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'status', status: e.status });
          } else if (e.kind === 'log') {
            if (wc) emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'log', stream: e.stream, line: e.line });
          } else if (e.kind === 'branch') {
            if (taskId) void persistStoryBranch(req.folderPath, taskId, e.branch);
            if (wc) emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'branch', branch: e.branch });
          } else if (e.kind === 'pr') {
            if (taskId) void persistStoryPr(req.folderPath, taskId, e.branch, e.url);
            if (wc) emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'pr', url: e.url, branch: e.branch });
          } else if (e.kind === 'limit-hit') {
            if (taskId) void persistStoryLimitHit(req.folderPath, taskId, e.resetsAt);
            scheduleResumeAt(e.resetsAt, getWebContents);
            if (wc) emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'limit-hit', resetsAt: e.resetsAt });
          }
        },
      });
      void handle.result
        .catch((err) => {
          const wc = getWebContents();
          if (!wc) return;
          emitToRenderer(wc, {
            runId: req.runId,
            storyIndex: req.storyIndex,
            kind: 'log',
            stream: 'stderr',
            line: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => releaseRunner());
      return { kind: 'ok' };
    }
  );

  ipcMain.handle(
    IpcChannels.ResumeTask,
    async (_event, req: ResumeTaskRequest): Promise<ResumeTaskResult> => {
      const userData = await loadUserData(app.getPath('userData'));
      const folderPath = userData.lastOpenedFolder;
      if (!folderPath) return { kind: 'error', message: 'No folder is currently opened' };
      const project = await loadProject(folderPath);
      if (!project) return { kind: 'error', message: 'No project state found to resume from' };
      const storyIndex = project.plan.stories.findIndex((s) => s.taskId === req.taskId);
      if (storyIndex < 0) return { kind: 'error', message: `Task ${req.taskId} is not in the current plan` };
      const story = project.plan.stories[storyIndex];
      const task = project.tasks[req.taskId];
      // Branch name is deterministic from <numericId>-<title-slug>; fall back to it
      // when an interrupt happened before the 'branch' event was persisted.
      // attachWorktree validates the branch/worktree actually exists and throws
      // otherwise — so an invalid inference surfaces as a clear error downstream.
      const branch = task?.branch ?? `nightcoder/${slugify(`${story.numericId ?? storyIndex + 1}-${story.title}`)}`;
      // If the interrupt happened after claude finished (status=pushing), skip
      // rerunning the whole session — just redo the push + PR step.
      const pushOnly = task?.status === 'pushing';

      const [plan, journalTail, attachedFiles] = await Promise.all([
        readPlanMd(folderPath, req.taskId),
        readJournalTail(folderPath, req.taskId),
        listTaskFiles(folderPath, req.taskId),
      ]);
      const prompt = buildResumePrompt({
        story,
        plan,
        journalTail,
        attachedFileNames: attachedFiles.map((f) => f.name),
      });
      const runId = `resume-${Date.now()}-${req.taskId}`;

      await acquireRunner();
      const handle = runStoryResume({
        story,
        storyIndex,
        repoPath: folderPath,
        resume: { branch, prompt, pushOnly },
        onEvent: (e) => {
          const wc = getWebContents();
          if (e.kind === 'status') {
            void persistStoryStatus(folderPath, req.taskId, e.status);
            if (wc) emitToRenderer(wc, { runId, storyIndex: e.storyIndex, kind: 'status', status: e.status });
          } else if (e.kind === 'log') {
            if (wc) emitToRenderer(wc, { runId, storyIndex: e.storyIndex, kind: 'log', stream: e.stream, line: e.line });
          } else if (e.kind === 'branch') {
            void persistStoryBranch(folderPath, req.taskId, e.branch);
            if (wc) emitToRenderer(wc, { runId, storyIndex: e.storyIndex, kind: 'branch', branch: e.branch });
          } else if (e.kind === 'pr') {
            void persistStoryPr(folderPath, req.taskId, e.branch, e.url);
            if (wc) emitToRenderer(wc, { runId, storyIndex: e.storyIndex, kind: 'pr', url: e.url, branch: e.branch });
          } else if (e.kind === 'limit-hit') {
            void persistStoryLimitHit(folderPath, req.taskId, e.resetsAt);
            scheduleResumeAt(e.resetsAt, getWebContents);
            if (wc) emitToRenderer(wc, { runId, storyIndex: e.storyIndex, kind: 'limit-hit', resetsAt: e.resetsAt });
          }
        },
      });
      void handle.result
        .catch((err) => {
          const wc = getWebContents();
          if (!wc) return;
          emitToRenderer(wc, {
            runId,
            storyIndex,
            kind: 'log',
            stream: 'stderr',
            line: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => releaseRunner());
      return { kind: 'ok', runId };
    },
  );

  ipcMain.handle(IpcChannels.CancelRun, async (_event, runId: string): Promise<void> => {
    activeRuns.get(runId)?.cancel();
  });

  ipcMain.handle(IpcChannels.LoadState, async (): Promise<LoadedAppState> => {
    await migrateLegacyIfNeeded(app.getPath('userData')).catch(() => {});
    const userData = await loadUserData(app.getPath('userData'));
    const folderPath = userData.lastOpenedFolder;
    let folder: PickFolderResult | null = null;
    if (folderPath) {
      try {
        await access(path.join(folderPath, '.git'));
        const gitRepo = await isGitRepo(folderPath);
        const origin = gitRepo ? await hasGitOrigin(folderPath) : false;
        folder = { kind: 'selected', path: folderPath, isGitRepo: gitRepo, hasOrigin: origin };
      } catch {
        folder = null;
      }
    }
    if (!folderPath || !folder) {
      return { folder, brief: '', plan: null, runtime: null };
    }
    const project = await loadProject(folderPath);
    if (!project) {
      return { folder, brief: '', plan: null, runtime: null };
    }
    const runtime = tasksToRuntime(project.plan, project.tasks);
    return { folder, brief: project.brief, plan: project.plan, runtime };
  });

  ipcMain.handle(IpcChannels.SaveState, async (_event, state: PersistedState): Promise<void> => {
    if (state.folderPath) {
      await saveUserData(app.getPath('userData'), { lastOpenedFolder: state.folderPath }).catch(() => {});
    }
    if (!state.folderPath || !state.plan) return;
    // Pull current tasks, merge plan (preserves done/review), then overlay the
    // renderer-provided runtime snapshot. Main-process updateTask calls on
    // RunEvents remain the source of truth for actively running tasks; this
    // pathway handles brief/plan edits and renderer-driven status tweaks.
    const current = await loadProject(state.folderPath);
    const base = current ?? { version: 1 as const, brief: '', plan: state.plan, tasks: {}, nextTaskNum: 1 };
    const nextBrief = state.brief ?? base.brief;
    const merged = mergePlanOnReplan(base, state.plan);
    const nextTasks = state.runtime ? runtimeToTasks(merged.plan, state.runtime, merged.tasks) : merged.tasks;
    await saveProject(state.folderPath, { ...merged, brief: nextBrief, tasks: nextTasks });
  });

  ipcMain.handle(IpcChannels.GetUsage, async (): Promise<Usage | null> => {
    return refreshUsage(getWebContents);
  });

  ipcMain.handle(IpcChannels.OpenExternal, async (_event, url: string): Promise<void> => {
    await shell.openExternal(url);
  });

  ipcMain.handle(IpcChannels.PickFilesToAttach, async (): Promise<PickFilesToAttachResult> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      title: 'Attach files to task',
    });
    if (result.canceled || result.filePaths.length === 0) return { kind: 'cancelled' };
    return { kind: 'selected', paths: result.filePaths };
  });

  ipcMain.handle(
    IpcChannels.AddTaskFiles,
    async (_event, req: AddTaskFilesRequest): Promise<AddTaskFilesResult> => {
      try {
        const userData = await loadUserData(app.getPath('userData'));
        const folderPath = userData.lastOpenedFolder;
        if (!folderPath) return { kind: 'error', message: 'No folder is currently opened' };
        if (!req.taskId) return { kind: 'error', message: 'Missing taskId' };
        const files = await copyTaskFiles(folderPath, req.taskId, req.sourcePaths);
        return { kind: 'ok', files };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    },
  );

  ipcMain.handle(
    IpcChannels.ListTaskFiles,
    async (_event, req: ListTaskFilesRequest): Promise<ListTaskFilesResult> => {
      try {
        const userData = await loadUserData(app.getPath('userData'));
        const folderPath = userData.lastOpenedFolder;
        if (!folderPath) return { kind: 'error', message: 'No folder is currently opened' };
        const files = await listTaskFiles(folderPath, req.taskId);
        return { kind: 'ok', files };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    },
  );

  ipcMain.handle(
    IpcChannels.GetTaskDiff,
    async (_event, req: GetTaskDiffRequest): Promise<TaskDiffResult> => {
      try {
        const userData = await loadUserData(app.getPath('userData'));
        const folderPath = userData.lastOpenedFolder;
        if (!folderPath) return { kind: 'error', message: 'No folder is currently opened' };
        const project = await loadProject(folderPath);
        if (!project) return { kind: 'empty', reason: 'no-branch' };
        const story = project.plan.stories.find((s) => s.taskId === req.taskId);
        if (!story) return { kind: 'error', message: `Task ${req.taskId} is not in the current plan` };
        // Prefer the persisted branch; otherwise derive the deterministic name
        // so users can see a diff for the running task even before the
        // 'branch' event has been flushed to disk.
        const task = project.tasks[req.taskId];
        const derivedBranch = `nightcoder/${slugify(`${story.numericId ?? project.plan.stories.indexOf(story) + 1}-${story.title}`)}`;
        const branch = task?.branch ?? derivedBranch;
        return await getTaskDiff({ repoPath: folderPath, branch });
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    },
  );

  ipcMain.handle(
    IpcChannels.SquashMergeTask,
    async (_event, req: SquashMergeTaskRequest): Promise<SquashMergeTaskResult> => {
      try {
        const userData = await loadUserData(app.getPath('userData'));
        const folderPath = userData.lastOpenedFolder;
        if (!folderPath) return { kind: 'error', message: 'No folder is currently opened' };
        const project = await loadProject(folderPath);
        if (!project) return { kind: 'error', message: 'No project state found' };
        const story = project.plan.stories.find((s) => s.taskId === req.taskId);
        if (!story) return { kind: 'error', message: `Task ${req.taskId} is not in the current plan` };
        const task = project.tasks[req.taskId];
        const prUrl = task?.prUrl;
        if (!prUrl) {
          return { kind: 'error', message: 'This task has no associated pull request yet.' };
        }
        const subject = formatSquashCommitTitle(story);
        await ghSquashMergePr({ cwd: folderPath, prUrl, subject });
        await persistStoryStatus(folderPath, req.taskId, 'done');
        const wc = getWebContents();
        if (wc) {
          emitToRenderer(wc, {
            runId: `squash-merge-${req.taskId}`,
            storyIndex: project.plan.stories.indexOf(story),
            kind: 'status',
            status: 'done',
          });
        }
        return { kind: 'ok', prUrl, subject };
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        const stderr = (err as { stderr?: string }).stderr;
        return { kind: 'error', message: stderr ? `${raw}\n${stderr}` : raw };
      }
    },
  );

  ipcMain.handle(
    IpcChannels.RemoveTaskFile,
    async (_event, req: RemoveTaskFileRequest): Promise<RemoveTaskFileResult> => {
      try {
        const userData = await loadUserData(app.getPath('userData'));
        const folderPath = userData.lastOpenedFolder;
        if (!folderPath) return { kind: 'error', message: 'No folder is currently opened' };
        const files = await removeTaskFile(folderPath, req.taskId, req.name);
        return { kind: 'ok', files };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    },
  );

  ipcMain.handle(
    IpcChannels.RemoveStory,
    async (_event, payload: RemoveStoryPayload): Promise<RemoveStoryResult> => {
      if (activeRuns.size > 0) {
        throw new Error('Cannot remove a story while a run is active');
      }

      const userData = await loadUserData(app.getPath('userData'));
      const folderPath = userData.lastOpenedFolder;
      if (!folderPath) {
        throw new Error('No folder is currently opened');
      }
      const project = await loadProject(folderPath);
      if (!project) {
        throw new Error('No plan is currently stored');
      }

      const story = project.plan.stories[payload.storyIndex];
      if (!story) {
        throw new Error(`Story ${payload.storyIndex} not found in plan`);
      }

      const updatedPlan = removeStoryFromPlan(project.plan, payload.storyIndex);

      let branchDeletionWarning: string | undefined;
      const persistedBranch = project.tasks[story.taskId]?.branch;
      if (persistedBranch) {
        // Worktree must come off first — `git branch -D` fails while the
        // branch is checked out somewhere.
        await removeWorktreeForBranch({ repoPath: folderPath, branch: persistedBranch }).catch(() => {});
        const result = await deleteStoryBranch({ repoPath: folderPath, branch: persistedBranch });
        branchDeletionWarning = result.warning;
      }

      const { [story.taskId]: _removed, ...remainingTasks } = project.tasks;
      void _removed;
      await saveProject(folderPath, { ...project, plan: updatedPlan, tasks: remainingTasks });
      await archiveDroppedTaskFolders(folderPath, [story.taskId]).catch(() => {
        // Archive is best-effort — branch is already deleted and state is saved.
      });

      return { plan: updatedPlan, ...(branchDeletionWarning !== undefined ? { branchDeletionWarning } : {}) };
    }
  );
}

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'NightCoder',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && DEV_URL) {
    await mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist-renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  const getWebContents = () => mainWindow?.webContents ?? null;
  registerIpc(getWebContents);
  createWindow();
  startUsagePolling(getWebContents);
  void rearmResumeScheduleFromDisk(getWebContents);
});

/**
 * On app launch, look at the last opened project's task file. If any task is
 * stuck in `interrupted`, pick the earliest known `limitResetsAt` and arm the
 * auto-resume timer. Missing timestamps fall back to a short poll so we don't
 * leave the user stranded.
 */
async function rearmResumeScheduleFromDisk(getWebContents: () => WebContents | null): Promise<void> {
  try {
    const userData = await loadUserData(app.getPath('userData'));
    const folderPath = userData.lastOpenedFolder;
    if (!folderPath) return;
    const project = await loadProject(folderPath);
    if (!project) return;
    const interrupted = Object.values(project.tasks).filter((t) => t.status === 'interrupted');
    if (interrupted.length === 0) return;
    const resetTimes = interrupted
      .map((t) => (typeof t.limitResetsAt === 'number' && Number.isFinite(t.limitResetsAt) ? t.limitResetsAt : null))
      .filter((v): v is number => v !== null);
    const earliest = resetTimes.length > 0 ? Math.min(...resetTimes) : null;
    scheduleResumeAt(earliest, getWebContents);
  } catch {
    // Non-fatal — the user can still resume manually.
  }
}

app.on('window-all-closed', () => {
  for (const handle of activeRuns.values()) handle.cancel();
  activeRuns.clear();
  if (usagePollTimer) {
    clearInterval(usagePollTimer);
    usagePollTimer = null;
  }
  if (usageResetTimer) {
    clearTimeout(usageResetTimer);
    usageResetTimer = null;
  }
  clearResumeTimer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
