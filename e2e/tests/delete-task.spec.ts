import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import { buildPlan, installMockIpc } from '../fixtures/mock-ipc';

test.describe('Delete task', () => {
  test('removes a card from the queue', async ({ page }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
        plan: buildPlan([{ title: 'Disposable' }, { title: 'Keep me' }]),
      },
    });
    await page.goto('/');

    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('2');

    await page.getByTestId(TestIds.TaskCard.deleteBtn(0)).click();

    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('1');
    // The remaining task slid down to index 0.
    await expect(page.getByTestId(TestIds.TaskCard.title(0))).toHaveText('Keep me');
  });
});
