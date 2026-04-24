import { describe, expect, it } from 'vitest';
import type { RefinedPlan } from '@nightcoder/shared-types/ipc';
import { startPlanRun, type PlanEvent } from './run-plan';

const plan: RefinedPlan = {
  stories: [
    { title: 'A', description: '', acceptanceCriteria: [], affectedFiles: [] },
    { title: 'B', description: '', acceptanceCriteria: [], affectedFiles: [] },
    { title: 'C', description: '', acceptanceCriteria: [], affectedFiles: [] },
  ],
  dependencies: [],
};

describe('startPlanRun completedIndices seeding', () => {
  it('skips seeded-done stories and reports run-done success without touching git', async () => {
    const events: PlanEvent[] = [];
    const handle = startPlanRun({
      plan,
      repoPath: '/tmp/nightcoder-runplan-seed-test',
      baseBranch: 'main',
      completedIndices: [0, 1, 2],
      onEvent: (e) => events.push(e),
    });

    const res = await handle.result;

    expect(res.success).toBe(true);
    expect(events.some((e) => 'kind' in e && e.kind === 'run-done' && e.success)).toBe(true);
    // No story should have emitted a 'running' status event — all were seeded as done.
    expect(events.some((e) => 'kind' in e && e.kind === 'status' && e.status === 'running')).toBe(false);
  });
});
