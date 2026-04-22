import { app, BrowserWindow, dialog, ipcMain, type WebContents } from 'electron';
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
  type RunEvent,
  type PersistedState,
  type LoadedAppState,
} from '@zibby/shared-types/ipc';
import { refine, advise } from '@zibby/ai-refiner';
import { startPlanRun, type PlanRunHandle } from '@zibby/orchestrator';
import { loadPersisted, savePersisted } from './state-store';

const execFileP = promisify(execFile);
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(DEV_URL);

const activeRuns = new Map<string, PlanRunHandle>();

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
        const handle = startPlanRun({
          plan: req.plan,
          repoPath: req.folderPath,
          baseBranch: req.baseBranch,
          onEvent: (e) => {
            const wc = getWebContents();
            if (!wc) return;
            if ('storyIndex' in e) {
              if (e.kind === 'status') {
                emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'status',
                  status: e.status,
                });
              } else if (e.kind === 'log') {
                emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'log',
                  stream: e.stream,
                  line: e.line,
                });
              } else if (e.kind === 'pr') {
                emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'pr',
                  url: e.url,
                  branch: e.branch,
                });
              }
            } else if (e.kind === 'run-done') {
              emitToRenderer(wc, { runId: handle.runId, kind: 'run-done', success: e.success });
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

  ipcMain.handle(IpcChannels.CancelRun, async (_event, runId: string): Promise<void> => {
    activeRuns.get(runId)?.cancel();
  });

  ipcMain.handle(IpcChannels.LoadState, async (): Promise<LoadedAppState> => {
    const state = await loadPersisted(app.getPath('userData'));
    let folder: PickFolderResult | null = null;
    if (state.folderPath) {
      try {
        await access(path.join(state.folderPath, '.git'));
        const gitRepo = await isGitRepo(state.folderPath);
        const origin = gitRepo ? await hasGitOrigin(state.folderPath) : false;
        folder = { kind: 'selected', path: state.folderPath, isGitRepo: gitRepo, hasOrigin: origin };
      } catch {
        folder = null;
      }
    }
    return { folder, brief: state.brief ?? '', plan: state.plan ?? null };
  });

  ipcMain.handle(IpcChannels.SaveState, async (_event, state: PersistedState): Promise<void> => {
    await savePersisted(app.getPath('userData'), state);
  });
}

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Zibby 2.0',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev && DEV_URL) {
    await mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist-renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  registerIpc(() => mainWindow?.webContents ?? null);
  createWindow();
});

app.on('window-all-closed', () => {
  for (const handle of activeRuns.values()) handle.cancel();
  activeRuns.clear();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
