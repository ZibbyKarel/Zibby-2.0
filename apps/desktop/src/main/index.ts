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
} from '@nightcoder/shared-types/ipc';
import type { Usage } from '@nightcoder/shared-types/ipc';
import { refine, advise } from '@nightcoder/ai-refiner';
import { buildResumePrompt, runSingleStory, runStoryResume, startPlanRun, removeStoryFromPlan, type PlanRunHandle } from '@nightcoder/orchestrator';
import { deleteStoryBranch } from '@nightcoder/github';
import { fetchUsage } from '@nightcoder/usage';
import {
  initProject,
  loadProject,
  mergePlanOnReplan,
  readJournalTail,
  readPlanMd,
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

const USAGE_POLL_INTERVAL_MS = 5 * 60 * 1000;
let cachedUsage: Usage | null = null;
let usagePollTimer: ReturnType<typeof setInterval> | null = null;
let usageInFlight: Promise<Usage | null> | null = null;

async function refreshUsage(getWebContents: () => WebContents | null): Promise<Usage | null> {
  if (usageInFlight) return usageInFlight;
  usageInFlight = (async () => {
    try {
      const usage = await fetchUsage();
      cachedUsage = usage;
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
  try {
    await updateTask(repoPath, taskId, patch);
  } catch {
    // Persistence failures never crash the run — the UI still sees the event.
  }
}

async function persistStoryPr(repoPath: string, taskId: string, branch: string, url: string): Promise<void> {
  try {
    await updateTask(repoPath, taskId, { branch, prUrl: url });
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
        await updatePlan(req.folderPath, req.plan).catch(() => {});
        const taskIdFor = (idx: number): string | undefined => req.plan.stories[idx]?.taskId;
        const handle = startPlanRun({
          plan: req.plan,
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
              } else if (e.kind === 'pr') {
                if (tid) void persistStoryPr(req.folderPath, tid, e.branch, e.url);
                if (wc) emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'pr',
                  url: e.url,
                  branch: e.branch,
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
          } else if (e.kind === 'pr') {
            if (taskId) void persistStoryPr(req.folderPath, taskId, e.branch, e.url);
            if (wc) emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'pr', url: e.url, branch: e.branch });
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
      if (!task?.branch) {
        return { kind: 'error', message: `Task ${req.taskId} has no persisted branch — nothing to resume into` };
      }

      const [plan, journalTail] = await Promise.all([
        readPlanMd(folderPath, req.taskId),
        readJournalTail(folderPath, req.taskId),
      ]);
      const prompt = buildResumePrompt({ story, plan, journalTail });
      const runId = `resume-${Date.now()}-${req.taskId}`;

      await acquireRunner();
      const handle = runStoryResume({
        story,
        storyIndex,
        repoPath: folderPath,
        resume: { branch: task.branch, prompt },
        onEvent: (e) => {
          const wc = getWebContents();
          if (e.kind === 'status') {
            void persistStoryStatus(folderPath, req.taskId, e.status);
            if (wc) emitToRenderer(wc, { runId, storyIndex: e.storyIndex, kind: 'status', status: e.status });
          } else if (e.kind === 'log') {
            if (wc) emitToRenderer(wc, { runId, storyIndex: e.storyIndex, kind: 'log', stream: e.stream, line: e.line });
          } else if (e.kind === 'pr') {
            void persistStoryPr(folderPath, req.taskId, e.branch, e.url);
            if (wc) emitToRenderer(wc, { runId, storyIndex: e.storyIndex, kind: 'pr', url: e.url, branch: e.branch });
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
    const base = current ?? { version: 1 as const, brief: '', plan: state.plan, tasks: {} };
    const nextBrief = state.brief ?? base.brief;
    const merged = mergePlanOnReplan(base, state.plan);
    const nextTasks = state.runtime ? runtimeToTasks(merged.plan, state.runtime, merged.tasks) : merged.tasks;
    await saveProject(state.folderPath, { ...merged, brief: nextBrief, tasks: nextTasks });
  });

  ipcMain.handle(IpcChannels.GetUsage, async (): Promise<Usage | null> => {
    return refreshUsage(getWebContents);
  });

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
        const result = await deleteStoryBranch({ repoPath: folderPath, branch: persistedBranch });
        branchDeletionWarning = result.warning;
      }

      const { [story.taskId]: _removed, ...remainingTasks } = project.tasks;
      void _removed;
      await saveProject(folderPath, { ...project, plan: updatedPlan, tasks: remainingTasks });

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
});

app.on('window-all-closed', () => {
  for (const handle of activeRuns.values()) handle.cancel();
  activeRuns.clear();
  if (usagePollTimer) {
    clearInterval(usagePollTimer);
    usagePollTimer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
