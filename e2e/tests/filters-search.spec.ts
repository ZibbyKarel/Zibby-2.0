import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import { buildPlan, emitStatus, installMockIpc } from '../fixtures/mock-ipc';

test.describe('Search & filter chips', () => {
  test('search input filters cards by title', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([
          { title: 'Add login screen' },
          { title: 'Refactor dashboard' },
          { title: 'Set up logging' },
        ]),
      },
    });
    await page.goto('/');

    // Three cards visible initially.
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('3');

    await page.getByTestId(TestIds.TopBar.searchInput).fill('dashboard');

    // Only the matching card stays visible.
    await expect(page.getByTestId(TestIds.TaskCard.root(0))).toHaveCount(0);
    await expect(page.getByTestId(TestIds.TaskCard.root(1))).toBeVisible();
    await expect(page.getByTestId(TestIds.TaskCard.root(2))).toHaveCount(0);
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('1');
  });

  test('Pending filter chip narrows results to pending/blocked tasks', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'A' }, { title: 'B' }]),
      },
    });
    await page.goto('/');

    // Move A to running, leave B pending.
    await page.getByTestId(TestIds.TaskCard.runBtn(0)).click();
    await emitStatus(page, 0, 'running');
    await expect(page.getByTestId(TestIds.Board.columnCount('running'))).toHaveText('1');

    await page.getByTestId(TestIds.SubBar.filterPending).click();

    // Running task is filtered out, pending one stays.
    await expect(page.getByTestId(TestIds.TaskCard.root(0))).toHaveCount(0);
    await expect(page.getByTestId(TestIds.TaskCard.root(1))).toBeVisible();
  });

  test('Cancelled / Error filter shows only failed and cancelled tasks', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'Healthy' }, { title: 'Boom' }]),
      },
    });
    await page.goto('/');

    // Move story 1 to failed.
    await page.getByTestId(TestIds.TaskCard.runBtn(1)).click();
    await emitStatus(page, 1, 'running');
    await emitStatus(page, 1, 'failed');

    await page.getByTestId(TestIds.SubBar.filterCancelledErr).click();

    await expect(page.getByTestId(TestIds.TaskCard.root(0))).toHaveCount(0);
    await expect(page.getByTestId(TestIds.TaskCard.root(1))).toBeVisible();
  });
});
