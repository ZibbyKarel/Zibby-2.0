import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import { installMockIpc } from '../fixtures/mock-ipc';

test.describe('Add task flow', () => {
  test('opens the dialog from the sub-bar and adds a queued task', async ({ page }) => {
    await installMockIpc(page);
    await page.goto('/');

    // No task cards yet.
    await expect(page.getByTestId(TestIds.Board.columnEmpty('queue'))).toBeVisible();
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('0');

    await page.getByTestId(TestIds.SubBar.addTaskBtn).click();
    await expect(page.getByTestId(TestIds.AddTaskDialog.root)).toBeVisible();

    await page.getByTestId(TestIds.AddTaskDialog.titleInput).fill('Wire up onboarding');
    await page
      .getByTestId(TestIds.AddTaskDialog.descriptionInput)
      .fill('Build the first-run welcome screen and persist completion state.');
    await page
      .getByTestId(TestIds.AddTaskDialog.acceptanceInput)
      .fill('Welcome screen renders\nState persisted on close');

    await page.getByTestId(TestIds.AddTaskDialog.submitBtn).click();

    // Dialog closes …
    await expect(page.getByTestId(TestIds.AddTaskDialog.root)).toHaveCount(0);
    // … and a task card appears in the queue column with the title we typed.
    await expect(page.getByTestId(TestIds.TaskCard.root(0))).toBeVisible();
    await expect(page.getByTestId(TestIds.TaskCard.title(0))).toHaveText('Wire up onboarding');
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('1');
  });

  test('submit is disabled while description is empty', async ({ page }) => {
    await installMockIpc(page);
    await page.goto('/');

    await page.getByTestId(TestIds.SubBar.addTaskBtn).click();
    await expect(page.getByTestId(TestIds.AddTaskDialog.submitBtn)).toBeDisabled();

    await page.getByTestId(TestIds.AddTaskDialog.descriptionInput).fill('do the thing');
    await expect(page.getByTestId(TestIds.AddTaskDialog.submitBtn)).toBeEnabled();
  });

  test('Cancel button closes the dialog without adding a task', async ({ page }) => {
    await installMockIpc(page);
    await page.goto('/');

    await page.getByTestId(TestIds.SubBar.addTaskBtn).click();
    await page.getByTestId(TestIds.AddTaskDialog.descriptionInput).fill('throwaway');
    await page.getByTestId(TestIds.AddTaskDialog.cancelBtn).click();

    await expect(page.getByTestId(TestIds.AddTaskDialog.root)).toHaveCount(0);
    await expect(page.getByTestId(TestIds.TaskCard.root(0))).toHaveCount(0);
  });
});
