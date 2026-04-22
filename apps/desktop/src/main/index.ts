import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config as loadDotenv } from 'dotenv';
import {
  IpcChannels,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
} from '@zibby/shared-types';
import { refine } from '@zibby/ai-refiner';

loadDotenv({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') });

const execFileP = promisify(execFile);
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(DEV_URL);

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

function registerIpc() {
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
}

async function createWindow() {
  const win = new BrowserWindow({
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
    await win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(path.join(__dirname, '..', '..', 'dist-renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
