import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import { installMockIpc } from '../fixtures/mock-ipc';

test.describe('Command palette', () => {
  test('Cmd+K opens the palette and Esc closes it', async ({ page }) => {
    await installMockIpc(page);
    await page.goto('/');

    await expect(page.getByTestId(TestIds.CommandPalette.root)).toHaveCount(0);

    // Cmd+K on macOS, Ctrl+K elsewhere — App.tsx accepts either.
    await page.keyboard.press('ControlOrMeta+K');
    await expect(page.getByTestId(TestIds.CommandPalette.root)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId(TestIds.CommandPalette.root)).toHaveCount(0);
  });

  test('running the "Add task" command opens the dialog', async ({ page }) => {
    await installMockIpc(page);
    await page.goto('/');

    await page.keyboard.press('ControlOrMeta+K');
    await page.getByTestId(TestIds.CommandPalette.input).fill('Add task');

    await page.getByTestId(TestIds.CommandPalette.item('add')).click();

    await expect(page.getByTestId(TestIds.CommandPalette.root)).toHaveCount(0);
    await expect(page.getByTestId(TestIds.AddTaskDialog.root)).toBeVisible();
  });

  test('shows the empty state when nothing matches', async ({ page }) => {
    await installMockIpc(page);
    await page.goto('/');

    await page.keyboard.press('ControlOrMeta+K');
    await page.getByTestId(TestIds.CommandPalette.input).fill('zzzzz-nope');

    await expect(page.getByTestId(TestIds.CommandPalette.empty)).toBeVisible();
  });
});
