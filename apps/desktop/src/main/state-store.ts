import { readFile, writeFile, rename, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { PersistedPlanSchema, PersistedRuntimeSchema } from '@nightcoder/shared-types/schemas';
import { assignTaskIds } from '@nightcoder/shared-types/task-id';
import type { RefinedPlan } from '@nightcoder/shared-types/ipc';
import { initProject, projectDir, runtimeToTasks, saveProject } from '@nightcoder/project-state';

const FILE_NAME = 'nightcoder-state.json';

export type UserDataState = {
  lastOpenedFolder?: string;
};

function resolveFile(userDataDir: string): string {
  return path.join(userDataDir, FILE_NAME);
}

async function readRaw(userDataDir: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(resolveFile(userDataDir), 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function writeRaw(userDataDir: string, payload: UserDataState): Promise<void> {
  await mkdir(userDataDir, { recursive: true });
  const file = resolveFile(userDataDir);
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
  await rename(tmp, file);
}

export async function loadUserData(userDataDir: string): Promise<UserDataState> {
  const raw = await readRaw(userDataDir);
  if (!raw) return {};
  const out: UserDataState = {};
  if (typeof raw['lastOpenedFolder'] === 'string') out.lastOpenedFolder = raw['lastOpenedFolder'];
  else if (typeof raw['folderPath'] === 'string') out.lastOpenedFolder = raw['folderPath'];
  return out;
}

export async function saveUserData(userDataDir: string, state: UserDataState): Promise<void> {
  await writeRaw(userDataDir, state);
}

/**
 * One-time migration: if the legacy user-data file has plan/runtime/brief and
 * the target folder's `.nightcoder/` is absent, fold those fields into a fresh
 * per-project ProjectState, then rewrite user-data to just `lastOpenedFolder`.
 */
export async function migrateLegacyIfNeeded(userDataDir: string): Promise<void> {
  const raw = await readRaw(userDataDir);
  if (!raw) return;
  const hasLegacyFields =
    typeof raw['folderPath'] === 'string' &&
    (raw['plan'] !== undefined || raw['runtime'] !== undefined || typeof raw['brief'] === 'string');
  if (!hasLegacyFields) return;
  const folderPath = raw['folderPath'] as string;
  const brief = typeof raw['brief'] === 'string' ? raw['brief'] : '';

  let plan: RefinedPlan | null = null;
  if (raw['plan'] !== undefined) {
    const parsed = PersistedPlanSchema.safeParse(raw['plan']);
    if (parsed.success) {
      plan = {
        stories: assignTaskIds(parsed.data.stories),
        dependencies: parsed.data.dependencies,
      };
    }
  }

  let runtime: Record<number, import('@nightcoder/shared-types/ipc').PersistedStoryRuntime> = {};
  if (raw['runtime'] !== undefined) {
    const parsed = PersistedRuntimeSchema.safeParse(raw['runtime']);
    if (parsed.success) runtime = parsed.data;
  }

  try {
    await access(path.join(projectDir(folderPath), 'index.json'));
    // Already migrated (or written separately) — just strip the legacy fields.
    await writeRaw(userDataDir, { lastOpenedFolder: folderPath });
    return;
  } catch {
    // .nightcoder/ doesn't exist yet — proceed to migrate.
  }

  if (plan && plan.stories.length > 0) {
    try {
      await initProject(folderPath);
      await saveProject(folderPath, {
        version: 1,
        brief,
        plan,
        tasks: runtimeToTasks(plan, runtime),
      });
    } catch {
      // Can't write to the folder (permission, deleted, etc.) — leave legacy
      // fields untouched so a future session can retry.
      return;
    }
  }

  await writeRaw(userDataDir, { lastOpenedFolder: folderPath });
}
