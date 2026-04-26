import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import { buildPlan, emitLog, emitStatus, installMockIpc } from '../fixtures/mock-ipc';

test.describe('Task drawer', () => {
  test('opens, switches between tabs, and closes', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'Inspect me' }]),
      },
    });
    await page.goto('/');

    await page.getByTestId(TestIds.TaskCard.root(0)).click();
    await expect(page.getByTestId(TestIds.Drawer.root)).toBeVisible();
    await expect(page.getByTestId(TestIds.Drawer.title)).toHaveText('Inspect me');

    // Logs panel is the default.
    await expect(page.getByTestId(TestIds.Drawer.panel('logs'))).toBeVisible();
    await expect(page.getByTestId(TestIds.Drawer.logsEmpty)).toBeVisible();

    // Switching tabs renders the corresponding panel.
    await page.getByTestId(TestIds.Drawer.tab('details')).click();
    await expect(page.getByTestId(TestIds.Drawer.panel('details'))).toBeVisible();
    await expect(page.getByTestId(TestIds.Drawer.detailsEditBtn)).toBeVisible();

    await page.getByTestId(TestIds.Drawer.closeBtn).click();
    await expect(page.getByTestId(TestIds.Drawer.root)).toHaveCount(0);
  });

  test('streaming logs become visible while the drawer is open', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'Streamy' }]),
      },
    });
    await page.goto('/');

    await page.getByTestId(TestIds.TaskCard.root(0)).click();
    await emitStatus(page, 0, 'running');
    await emitLog(page, 0, 'cloning repo…');
    await emitLog(page, 0, 'running tests…');

    await expect(page.getByTestId(TestIds.Drawer.logLine(1))).toContainText('cloning repo');
    await expect(page.getByTestId(TestIds.Drawer.logLine(2))).toContainText('running tests');
    await expect(page.getByTestId(TestIds.Drawer.logsEmpty)).toHaveCount(0);
  });

  test('editing details and saving updates the card title', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'Old title' }]),
      },
    });
    await page.goto('/');

    await page.getByTestId(TestIds.TaskCard.editBtn(0)).click();
    await expect(page.getByTestId(TestIds.Drawer.panel('details'))).toBeVisible();

    await page.getByTestId(TestIds.Drawer.detailsEditBtn).click();
    await page.getByTestId(TestIds.Drawer.detailsTitle).fill('Renamed task');
    await page.getByTestId(TestIds.Drawer.detailsDescription).fill('Updated description');
    await page.getByTestId(TestIds.Drawer.detailsSaveBtn).click();

    await page.getByTestId(TestIds.Drawer.closeBtn).click();
    await expect(page.getByTestId(TestIds.TaskCard.title(0))).toHaveText('Renamed task');
  });
});
