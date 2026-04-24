import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { RefinedPlan } from '@nightcoder/shared-types/ipc';
import {
  initProject,
  loadProject,
  mergePlanOnReplan,
  projectDir,
  runtimeToTasks,
  saveProject,
  tasksToRuntime,
  updatePlan,
  updateTask,
} from './project-state';

let repo: string;

beforeEach(async () => {
  repo = await mkdtemp(path.join(os.tmpdir(), 'nc-project-state-'));
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

const plan: RefinedPlan = {
  stories: [
    { taskId: 'add-login', title: 'Add login', description: 'd', acceptanceCriteria: [], affectedFiles: [] },
    { taskId: 'add-logout', title: 'Add logout', description: 'd', acceptanceCriteria: [], affectedFiles: [] },
  ],
  dependencies: [],
};

describe('initProject', () => {
  it('creates .nightcoder/ with index.json and inner .gitignore', async () => {
    await initProject(repo);
    const inner = await readFile(path.join(projectDir(repo), '.gitignore'), 'utf8');
    expect(inner).toBe('*\n');
    const state = await loadProject(repo);
    expect(state).not.toBeNull();
    expect(state!.version).toBe(1);
    expect(state!.tasks).toEqual({});
  });

  it('adds .nightcoder/ to the root .gitignore exactly once', async () => {
    await writeFile(path.join(repo, '.gitignore'), 'node_modules\n', 'utf8');
    await initProject(repo);
    await initProject(repo);
    const contents = await readFile(path.join(repo, '.gitignore'), 'utf8');
    const count = (contents.match(/^\.nightcoder\/?$/gm) ?? []).length;
    expect(count).toBe(1);
    expect(contents).toContain('node_modules');
  });

  it('creates .gitignore when absent', async () => {
    await initProject(repo);
    const contents = await readFile(path.join(repo, '.gitignore'), 'utf8');
    expect(contents).toContain('.nightcoder/');
  });

  it('does not clobber an existing index.json', async () => {
    await initProject(repo);
    await saveProject(repo, {
      version: 1,
      brief: 'hi',
      plan,
      tasks: { 'add-login': { taskId: 'add-login', status: 'done', branch: 'b', prUrl: 'u', startedAt: 1, endedAt: 2 } },
    });
    await initProject(repo);
    const loaded = await loadProject(repo);
    expect(loaded?.brief).toBe('hi');
    expect(loaded?.tasks['add-login']?.status).toBe('done');
  });
});

describe('saveProject / loadProject', () => {
  it('round-trips state', async () => {
    await initProject(repo);
    await saveProject(repo, { version: 1, brief: 'b', plan, tasks: {} });
    const loaded = await loadProject(repo);
    expect(loaded?.plan.stories.length).toBe(2);
    expect(loaded?.brief).toBe('b');
  });

  it('returns null for a missing file', async () => {
    expect(await loadProject(repo)).toBeNull();
  });

  it('returns null when the file is corrupt', async () => {
    await initProject(repo);
    await writeFile(path.join(projectDir(repo), 'index.json'), '{not json', 'utf8');
    expect(await loadProject(repo)).toBeNull();
  });
});

describe('updateTask', () => {
  it('creates a task entry on first write and merges on subsequent writes', async () => {
    await initProject(repo);
    await saveProject(repo, { version: 1, brief: '', plan, tasks: {} });
    await updateTask(repo, 'add-login', { status: 'running', startedAt: 100 });
    await updateTask(repo, 'add-login', { branch: 'nightcoder/add-login' });
    const state = await loadProject(repo);
    expect(state!.tasks['add-login']).toMatchObject({
      taskId: 'add-login',
      status: 'running',
      startedAt: 100,
      branch: 'nightcoder/add-login',
    });
  });

  it('serializes parallel updates without losing writes', async () => {
    await initProject(repo);
    await saveProject(repo, { version: 1, brief: '', plan, tasks: {} });
    await Promise.all([
      updateTask(repo, 'add-login', { status: 'running' }),
      updateTask(repo, 'add-logout', { status: 'running' }),
      updateTask(repo, 'add-login', { branch: 'b1' }),
    ]);
    const state = await loadProject(repo);
    expect(state!.tasks['add-login']?.status).toBe('running');
    expect(state!.tasks['add-login']?.branch).toBe('b1');
    expect(state!.tasks['add-logout']?.status).toBe('running');
  });
});

describe('mergePlanOnReplan', () => {
  it('keeps review/done tasks by taskId and resets others', async () => {
    const old = {
      version: 1 as const,
      brief: '',
      plan,
      tasks: {
        'add-login': { taskId: 'add-login', status: 'done' as const, branch: 'b', prUrl: 'u', startedAt: 1, endedAt: 2 },
        'add-logout': { taskId: 'add-logout', status: 'failed' as const, branch: null, prUrl: null, startedAt: 3, endedAt: 4 },
      },
    };
    const newPlan: RefinedPlan = {
      stories: [
        // Same title → same taskId → preserved done status
        { taskId: '', title: 'Add login', description: 'x', acceptanceCriteria: [], affectedFiles: [] },
        // Same title → same taskId → reset (was failed, not preserved)
        { taskId: '', title: 'Add logout', description: 'x', acceptanceCriteria: [], affectedFiles: [] },
        // New story → fresh task
        { taskId: '', title: 'Add signup', description: 'x', acceptanceCriteria: [], affectedFiles: [] },
      ],
      dependencies: [],
    };
    const merged = mergePlanOnReplan(old, newPlan);
    expect(merged.tasks['add-login'].status).toBe('done');
    expect(merged.tasks['add-login'].branch).toBe('b');
    expect(merged.tasks['add-logout'].status).toBe('pending');
    expect(merged.tasks['add-signup'].status).toBe('pending');
    expect(merged.plan.stories.map((s) => s.taskId)).toEqual(['add-login', 'add-logout', 'add-signup']);
  });

  it('drops tasks for stories whose titles were renamed (new taskId)', async () => {
    const old = {
      version: 1 as const,
      brief: '',
      plan,
      tasks: {
        'add-login': { taskId: 'add-login', status: 'done' as const, branch: 'b', prUrl: 'u', startedAt: 1, endedAt: 2 },
      },
    };
    const newPlan: RefinedPlan = {
      stories: [
        { taskId: '', title: 'Implement login flow', description: 'x', acceptanceCriteria: [], affectedFiles: [] },
      ],
      dependencies: [],
    };
    const merged = mergePlanOnReplan(old, newPlan);
    expect(merged.tasks['add-login']).toBeUndefined();
    expect(Object.keys(merged.tasks)).toEqual(['implement-login-flow']);
    expect(merged.tasks['implement-login-flow'].status).toBe('pending');
  });
});

describe('updatePlan', () => {
  it('persists the merged plan+brief atomically', async () => {
    await initProject(repo);
    await updatePlan(repo, plan, 'first brief');
    let loaded = await loadProject(repo);
    expect(loaded?.brief).toBe('first brief');
    expect(loaded?.plan.stories.length).toBe(2);

    await updatePlan(repo, {
      stories: [{ taskId: '', title: 'Add signup', description: 'x', acceptanceCriteria: [], affectedFiles: [] }],
      dependencies: [],
    }, 'second brief');
    loaded = await loadProject(repo);
    expect(loaded?.brief).toBe('second brief');
    expect(loaded?.plan.stories.map((s) => s.taskId)).toEqual(['add-signup']);
  });

  it('preserves brief when called without one', async () => {
    await initProject(repo);
    await updatePlan(repo, plan, 'preserved');
    await updatePlan(repo, plan);
    const loaded = await loadProject(repo);
    expect(loaded?.brief).toBe('preserved');
  });
});

describe('runtimeToTasks / tasksToRuntime', () => {
  it('round-trips between index-keyed runtime and taskId-keyed tasks', () => {
    const runtime = {
      0: { status: 'done' as const, branch: 'b', prUrl: 'u', startedAt: 1, endedAt: 2 },
      1: { status: 'running' as const, branch: null, prUrl: null, startedAt: 3, endedAt: null },
    };
    const tasks = runtimeToTasks(plan, runtime);
    expect(tasks['add-login'].status).toBe('done');
    expect(tasks['add-logout'].status).toBe('running');
    const back = tasksToRuntime(plan, tasks);
    expect(back[0].status).toBe('done');
    expect(back[1].status).toBe('running');
  });

  it('tasksToRuntime skips tasks whose taskId is not in the current plan', () => {
    const tasks = {
      'add-login': { taskId: 'add-login', status: 'done' as const, branch: null, prUrl: null, startedAt: null, endedAt: null },
      'orphan': { taskId: 'orphan', status: 'failed' as const, branch: null, prUrl: null, startedAt: null, endedAt: null },
    };
    const rt = tasksToRuntime(plan, tasks);
    expect(rt[0].status).toBe('done');
    expect(Object.keys(rt)).toHaveLength(1);
  });
});
