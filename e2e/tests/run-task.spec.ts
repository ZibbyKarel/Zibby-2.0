import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import { buildPlan, emitStatus, getCallCount, installMockIpc } from '../fixtures/mock-ipc';

test.describe('Run task flow', () => {
  test('clicking Run on a queued card invokes runStory and reflects status events', async ({
    page,
  }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'First story' }, { title: 'Second story' }]),
      },
    });
    await page.goto('/');

    // Both cards rendered in the queue column.
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('2');
    await expect(page.getByTestId(TestIds.TaskCard.root(0))).toBeVisible();

    // Pre-action: runStory has not been called yet.
    expect(await getCallCount(page, 'runStory')).toBe(0);

    await page.getByTestId(TestIds.TaskCard.runBtn(0)).click();
    expect(await getCallCount(page, 'runStory')).toBe(1);

    // Drive the orchestrator state machine via mocked events.
    await emitStatus(page, 0, 'running');
    await expect(page.getByTestId(TestIds.TaskCard.statusBadge(0))).toBeVisible();
    // Card moved into the "running" column.
    await expect(page.getByTestId(TestIds.Board.columnCount('running'))).toHaveText('1');
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('1');

    await emitStatus(page, 0, 'done');
    await expect(page.getByTestId(TestIds.Board.columnCount('done'))).toHaveText('1');
    await expect(page.getByTestId(TestIds.Board.columnCount('running'))).toHaveText('0');
  });

  test('Run all triggers startRun once', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'A' }, { title: 'B' }]),
      },
    });
    await page.goto('/');

    expect(await getCallCount(page, 'startRun')).toBe(0);
    await page.getByTestId(TestIds.SubBar.runAllBtn).click();
    expect(await getCallCount(page, 'startRun')).toBe(1);
  });

  test('failed status renders the failed badge', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'Risky' }]),
      },
    });
    await page.goto('/');

    await page.getByTestId(TestIds.TaskCard.runBtn(0)).click();
    await emitStatus(page, 0, 'running');
    await emitStatus(page, 0, 'failed');

    // 'failed' rolls up into the Done column per `statusToCol`.
    await expect(page.getByTestId(TestIds.Board.columnCount('done'))).toHaveText('1');
    await expect(page.getByTestId(TestIds.TaskCard.statusBadge(0))).toBeVisible();
  });
});
