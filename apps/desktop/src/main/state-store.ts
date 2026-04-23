import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PersistedPlanSchema, PersistedRuntimeSchema } from '@zibby/shared-types/schemas';
import type { PersistedState } from '@zibby/shared-types/ipc';

const FILE_NAME = 'zibby-state.json';

function resolveFile(userDataDir: string): string {
  return path.join(userDataDir, FILE_NAME);
}

export async function loadPersisted(userDataDir: string): Promise<PersistedState> {
  const file = resolveFile(userDataDir);
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: PersistedState = {};
    if (typeof parsed['folderPath'] === 'string') out.folderPath = parsed['folderPath'];
    if (typeof parsed['brief'] === 'string') out.brief = parsed['brief'];
    if (parsed['plan'] !== undefined) {
      const validated = PersistedPlanSchema.safeParse(parsed['plan']);
      if (validated.success) out.plan = validated.data;
    }
    if (parsed['runtime'] !== undefined) {
      const validated = PersistedRuntimeSchema.safeParse(parsed['runtime']);
      if (validated.success) out.runtime = validated.data;
    }
    if (parsed['refineModel'] === 'opus' || parsed['refineModel'] === 'sonnet' || parsed['refineModel'] === 'haiku') {
      out.refineModel = parsed['refineModel'];
    }
    return out;
  } catch {
    return {};
  }
}

export async function savePersisted(userDataDir: string, state: PersistedState): Promise<void> {
  await mkdir(userDataDir, { recursive: true });
  const file = resolveFile(userDataDir);
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
  await rename(tmp, file);
}
