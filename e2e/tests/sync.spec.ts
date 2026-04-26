import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import { getCallCount, installMockIpc } from '../fixtures/mock-ipc';

test.describe('Synchronize task states', () => {
  test('button is disabled until a folder is selected', async ({ page }) => {
    await installMockIpc(page, { initialState: { folder: null } });
    await page.goto('/');

    await expect(page.getByTestId(TestIds.SubBar.syncBtn)).toBeDisabled();
  });

  test('clicking Synchronize calls the IPC and surfaces a toast', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
      },
    });
    await page.goto('/');

    await expect(page.getByTestId(TestIds.SubBar.syncBtn)).toBeEnabled();
    await page.getByTestId(TestIds.SubBar.syncBtn).click();

    expect(await getCallCount(page, 'syncTaskStates')).toBe(1);
    await expect(page.getByTestId(TestIds.Toast.region)).toBeVisible();
  });
});
