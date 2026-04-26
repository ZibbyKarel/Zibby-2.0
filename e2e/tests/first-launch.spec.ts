import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import { installMockIpc } from '../fixtures/mock-ipc';

test.describe('First launch & top-bar shell', () => {
  test('shows the empty state with a Pick folder button', async ({ page }) => {
    await installMockIpc(page, { initialState: { folder: null } });
    await page.goto('/');

    await expect(page.getByTestId(TestIds.TopBar.root)).toBeVisible();
    await expect(page.getByTestId(TestIds.TopBar.pickFolderBtn)).toBeVisible();
    await expect(page.getByTestId(TestIds.TopBar.folderPath)).toHaveCount(0);
  });

  test('picking a folder updates the top-bar with its path', async ({ page }) => {
    await installMockIpc(page, {
      initialState: { folder: null },
      pickFolderResult: {
        kind: 'selected',
        path: '/Users/test/my-repo',
        isGitRepo: true,
        hasOrigin: true,
      },
    });
    await page.goto('/');

    await page.getByTestId(TestIds.TopBar.pickFolderBtn).click();

    await expect(page.getByTestId(TestIds.TopBar.folderPath)).toHaveText('/Users/test/my-repo');
    // The "Pick folder" button is replaced by the path chip + change button.
    await expect(page.getByTestId(TestIds.TopBar.pickFolderBtn)).toHaveCount(0);
    await expect(page.getByTestId(TestIds.TopBar.changeFolderBtn)).toBeVisible();
  });

  test('renders the four kanban columns by default', async ({ page }) => {
    await installMockIpc(page);
    await page.goto('/');

    for (const id of ['queue', 'running', 'review', 'done'] as const) {
      await expect(page.getByTestId(TestIds.Board.column(id))).toBeVisible();
      await expect(page.getByTestId(TestIds.Board.columnEmpty(id))).toBeVisible();
    }
  });

  test('theme toggle flips data-theme on the design-system root', async ({ page }) => {
    await installMockIpc(page);
    await page.goto('/');

    const dsRoot = page.locator('.ds-root');
    const initial = await dsRoot.getAttribute('data-theme');
    expect(initial === 'dark' || initial === 'light').toBeTruthy();

    await page.getByTestId(TestIds.TopBar.themeToggle).click();
    await expect(dsRoot).not.toHaveAttribute('data-theme', initial!);
  });
});
