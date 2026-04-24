import { appendFile, readFile, writeFile, rename, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import type {
  RefinedPlan,
  Story,
  PersistedTask,
  PersistedStoryRuntime,
  ProjectState,
  StoryStatus,
} from '@nightcoder/shared-types/ipc';
import { ProjectStateSchema } from '@nightcoder/shared-types/schemas';
import { assignTaskIds } from '@nightcoder/shared-types/task-id';

export const PROJECT_DIR = '.nightcoder';
const INDEX_FILE = 'index.json';
const TASKS_SUBDIR = 'tasks';
const ARCHIVE_SUBDIR = 'archive';
const INNER_GITIGNORE = '*\n';
const ROOT_GITIGNORE_LINE = '.nightcoder/';
const PRESERVED_ON_REPLAN: ReadonlySet<StoryStatus> = new Set(['review', 'done']);

export function projectDir(repoPath: string): string {
  return path.join(repoPath, PROJECT_DIR);
}

export function taskDir(repoPath: string, taskId: string): string {
  return path.join(projectDir(repoPath), TASKS_SUBDIR, taskId);
}

export function journalPath(repoPath: string, taskId: string): string {
  return path.join(taskDir(repoPath, taskId), 'journal.md');
}

export function planPath(repoPath: string, taskId: string): string {
  return path.join(taskDir(repoPath, taskId), 'plan.md');
}

export function storyJsonPath(repoPath: string, taskId: string): string {
  return path.join(taskDir(repoPath, taskId), 'story.json');
}

function indexFile(repoPath: string): string {
  return path.join(projectDir(repoPath), INDEX_FILE);
}

function emptyState(): ProjectState {
  return { version: 1, brief: '', plan: { stories: [], dependencies: [] }, tasks: {} };
}

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function ensureRootGitignore(repoPath: string): Promise<void> {
  const file = path.join(repoPath, '.gitignore');
  let existing = '';
  try {
    existing = await readFile(file, 'utf8');
  } catch {
    existing = '';
  }
  const lines = existing.split('\n').map((l) => l.trim());
  if (lines.includes(ROOT_GITIGNORE_LINE) || lines.includes('.nightcoder') || lines.includes('.nightcoder/*')) {
    return;
  }
  const needsNewline = existing.length > 0 && !existing.endsWith('\n');
  const next = existing + (needsNewline ? '\n' : '') + ROOT_GITIGNORE_LINE + '\n';
  await writeFile(file, next, 'utf8');
}

async function ensureInnerGitignore(repoPath: string): Promise<void> {
  const file = path.join(projectDir(repoPath), '.gitignore');
  if (await fileExists(file)) return;
  await writeFile(file, INNER_GITIGNORE, 'utf8');
}

export async function initProject(repoPath: string): Promise<void> {
  await mkdir(projectDir(repoPath), { recursive: true });
  await ensureInnerGitignore(repoPath);
  await ensureRootGitignore(repoPath).catch(() => {
    // Non-fatal — a non-git folder still gets a usable .nightcoder/ dir.
  });
  if (!(await fileExists(indexFile(repoPath)))) {
    await writeStateRaw(repoPath, emptyState());
  }
}

export async function loadProject(repoPath: string): Promise<ProjectState | null> {
  try {
    const raw = await readFile(indexFile(repoPath), 'utf8');
    const parsed = JSON.parse(raw);
    const result = ProjectStateSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

async function writeStateRaw(repoPath: string, state: ProjectState): Promise<void> {
  await mkdir(projectDir(repoPath), { recursive: true });
  const file = indexFile(repoPath);
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
  await rename(tmp, file);
}

const writeQueues = new Map<string, Promise<void>>();

/** Serialize all writes per repoPath — multiple runners update in parallel. */
function enqueue<T>(repoPath: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(repoPath) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  writeQueues.set(
    repoPath,
    next.then(() => undefined, () => undefined),
  );
  return next;
}

export async function saveProject(repoPath: string, state: ProjectState): Promise<void> {
  await enqueue(repoPath, () => writeStateRaw(repoPath, state));
}

export async function updateTask(
  repoPath: string,
  taskId: string,
  patch: Partial<Omit<PersistedTask, 'taskId'>>,
): Promise<void> {
  await enqueue(repoPath, async () => {
    const current = (await loadProject(repoPath)) ?? emptyState();
    const prev = current.tasks[taskId] ?? freshTask(taskId);
    const next: PersistedTask = { ...prev, ...patch, taskId };
    await writeStateRaw(repoPath, { ...current, tasks: { ...current.tasks, [taskId]: next } });
  });
}

export async function updatePlan(repoPath: string, plan: RefinedPlan, brief?: string): Promise<void> {
  await enqueue(repoPath, async () => {
    const current = (await loadProject(repoPath)) ?? emptyState();
    const merged = mergePlanOnReplan(current, plan);
    const keptIds = new Set(merged.plan.stories.map((s) => s.taskId));
    const droppedIds = Object.keys(current.tasks).filter((id) => !keptIds.has(id));
    await archiveDroppedTaskFolders(repoPath, droppedIds).catch(() => {
      // Archive is best-effort — never block a replan on fs errors.
    });
    await writeStateRaw(repoPath, { ...merged, brief: brief ?? current.brief });
  });
}

/**
 * Move per-task folders whose taskId disappeared from the plan (typically
 * because the user renamed a story's title) into `.nightcoder/archive/<ts>/`.
 * History is preserved; tasks/ stays clean. Best-effort — missing folders are
 * skipped, rename errors are swallowed.
 */
export async function archiveDroppedTaskFolders(
  repoPath: string,
  droppedTaskIds: readonly string[],
): Promise<string | null> {
  const checks = await Promise.all(
    droppedTaskIds.map(async (id) => ((await fileExists(taskDir(repoPath, id))) ? id : null)),
  );
  const present = checks.filter((id): id is string => id !== null);
  if (present.length === 0) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveRoot = path.join(projectDir(repoPath), ARCHIVE_SUBDIR, stamp);
  await mkdir(archiveRoot, { recursive: true });
  for (const id of present) {
    const src = taskDir(repoPath, id);
    const dst = path.join(archiveRoot, id);
    try {
      await rename(src, dst);
    } catch {
      // Rename across devices or a race with an active writer — skip.
    }
  }
  return archiveRoot;
}

function freshTask(taskId: string): PersistedTask {
  return { taskId, status: 'pending', branch: null, prUrl: null, startedAt: null, endedAt: null };
}

/**
 * When the user replans, keep tasks that are already `review`/`done` by taskId
 * match; everything else resets to `pending`. Renamed titles produce a new
 * taskId, so their old entries get dropped (and should be archived by the
 * caller if history preservation is needed).
 */
export function mergePlanOnReplan(old: ProjectState, newPlan: RefinedPlan): ProjectState {
  const newPlanWithIds: RefinedPlan = { ...newPlan, stories: assignTaskIds(newPlan.stories) as Story[] };
  const nextTasks: Record<string, PersistedTask> = {};
  for (const story of newPlanWithIds.stories) {
    const prior = old.tasks[story.taskId];
    if (prior && PRESERVED_ON_REPLAN.has(prior.status)) {
      nextTasks[story.taskId] = prior;
    } else {
      nextTasks[story.taskId] = freshTask(story.taskId);
    }
  }
  return { ...old, plan: newPlanWithIds, tasks: nextTasks };
}

/** Convert the new per-task map into the legacy index-keyed runtime shape. */
export function tasksToRuntime(
  plan: RefinedPlan,
  tasks: Record<string, PersistedTask>,
): Record<number, PersistedStoryRuntime> {
  const out: Record<number, PersistedStoryRuntime> = {};
  plan.stories.forEach((story, idx) => {
    const t = tasks[story.taskId];
    if (!t) return;
    out[idx] = {
      status: t.status,
      branch: t.branch,
      prUrl: t.prUrl,
      startedAt: t.startedAt,
      endedAt: t.endedAt,
    };
  });
  return out;
}

/**
 * Ensure the per-task folder exists and write the frozen story spec to
 * `story.json`. Called once per task start. Idempotent — overwrites
 * story.json so edits to title/description propagate.
 */
export async function ensureTaskDir(repoPath: string, story: Story): Promise<void> {
  const dir = taskDir(repoPath, story.taskId);
  await mkdir(dir, { recursive: true });
  await writeFile(storyJsonPath(repoPath, story.taskId), JSON.stringify(story, null, 2) + '\n', 'utf8');
}

export async function writePlanMd(repoPath: string, taskId: string, content: string): Promise<void> {
  await mkdir(taskDir(repoPath, taskId), { recursive: true });
  await writeFile(planPath(repoPath, taskId), content.endsWith('\n') ? content : content + '\n', 'utf8');
}

export async function readPlanMd(repoPath: string, taskId: string): Promise<string | null> {
  try {
    return await readFile(planPath(repoPath, taskId), 'utf8');
  } catch {
    return null;
  }
}

/** Return the last `maxLines` lines of the task journal, or '' if missing. */
export async function readJournalTail(
  repoPath: string,
  taskId: string,
  maxLines = 100,
): Promise<string> {
  try {
    const raw = await readFile(journalPath(repoPath, taskId), 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    return lines.slice(-maxLines).join('\n');
  } catch {
    return '';
  }
}

/**
 * Append one journal entry. Used by the polling fallback when the repo has a
 * foreign post-commit hook we can't replace. The hook itself writes entries
 * directly in the same format (shell script — no JS dependency).
 */
export async function appendJournalLine(
  repoPath: string,
  taskId: string,
  entry: { timestamp: number; hash: string; subject: string },
): Promise<void> {
  await mkdir(taskDir(repoPath, taskId), { recursive: true });
  await appendFile(
    journalPath(repoPath, taskId),
    `${entry.timestamp} ${entry.hash} ${entry.subject}\n`,
    'utf8',
  );
}

/** Convert the legacy index-keyed runtime into taskId-keyed tasks. */
export function runtimeToTasks(
  plan: RefinedPlan,
  runtime: Record<number, PersistedStoryRuntime>,
  prior: Record<string, PersistedTask> = {},
): Record<string, PersistedTask> {
  const out: Record<string, PersistedTask> = { ...prior };
  plan.stories.forEach((story, idx) => {
    const rt = runtime[idx];
    if (!rt) return;
    out[story.taskId] = {
      ...(out[story.taskId] ?? freshTask(story.taskId)),
      status: rt.status,
      branch: rt.branch,
      prUrl: rt.prUrl,
      startedAt: rt.startedAt,
      endedAt: rt.endedAt,
    };
  });
  return out;
}
