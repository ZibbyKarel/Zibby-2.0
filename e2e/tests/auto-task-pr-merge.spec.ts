import { expect, test } from '@playwright/test';
import { TestIds } from '@nightcoder/test-ids';
import {
  emitAutoMerge,
  emitBranch,
  emitPr,
  emitStatus,
  getCallCount,
  installMockIpc,
} from '../fixtures/mock-ipc';

/**
 * Covers the renderer side of the "fully automatic" task lifecycle landed on
 * `main` in commit 2e9ac2d (per-task auto-resolve conflicts + auto-merge PR):
 *
 *   1. user creates a task via the AddTask dialog and unchecks
 *      "Requires human review" so the orchestrator will auto-merge,
 *   2. user clicks Run on the new card → `runStory` IPC is invoked,
 *   3. the orchestrator emits the full `running → pushing → merging → merged`
 *      status sequence plus a `pr` and `auto-merge` event,
 *   4. the renderer surfaces the PR chip, the auto-merging chip while it polls,
 *      and finally the `merged` badge with the card landing in the Done column.
 *
 * The orchestrator side (`startAutoMerge`, `resolveConflicts`, `gh pr merge
 * --auto --squash`) is unit-tested in `libs/orchestrator/src/auto-merge.test.ts`
 * and `conflict-resolver.test.ts`. This spec verifies the renderer wires those
 * RunEvents into the right UI affordances end-to-end.
 */
test.describe('Auto task → PR → merge happy path', () => {
  test('creates a task with auto-merge enabled, runs it, surfaces PR chip and merged badge', async ({
    page,
  }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
      },
    });
    await page.goto('/');

    // ── 1. Create a task via the dialog with auto-merge enabled ─────────
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('0');

    await page.getByTestId(TestIds.SubBar.addTaskBtn).click();
    await expect(page.getByTestId(TestIds.AddTaskDialog.root)).toBeVisible();

    await page.getByTestId(TestIds.AddTaskDialog.titleInput).fill('Auto-merge test feature');
    await page
      .getByTestId(TestIds.AddTaskDialog.descriptionInput)
      .fill('Implement and merge automatically end-to-end.');

    // The checkbox defaults to checked (human review required). Uncheck it
    // so the orchestrator path is the auto-resolve + auto-merge one.
    const reviewCheckbox = page.getByTestId(TestIds.AddTaskDialog.requiresReviewCheckbox);
    await expect(reviewCheckbox).toBeChecked();
    await reviewCheckbox.uncheck();
    await expect(reviewCheckbox).not.toBeChecked();

    await page.getByTestId(TestIds.AddTaskDialog.submitBtn).click();
    await expect(page.getByTestId(TestIds.AddTaskDialog.root)).toHaveCount(0);

    // The card lands in the queue.
    await expect(page.getByTestId(TestIds.TaskCard.root(0))).toBeVisible();
    await expect(page.getByTestId(TestIds.TaskCard.title(0))).toHaveText('Auto-merge test feature');
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('1');

    // ── 2. Run the task → runStory IPC is invoked ───────────────────────
    expect(await getCallCount(page, 'runStory')).toBe(0);
    await page.getByTestId(TestIds.TaskCard.runBtn(0)).click();
    expect(await getCallCount(page, 'runStory')).toBe(1);

    // ── 3a. Implementation phase: running → pushing ─────────────────────
    await emitStatus(page, 0, 'running');
    await expect(page.getByTestId(TestIds.Board.columnCount('running'))).toHaveText('1');
    await expect(page.getByTestId(TestIds.Board.columnCount('queue'))).toHaveText('0');

    await emitBranch(page, 0, 'nightcoder/auto-merge-test-feature');
    await emitStatus(page, 0, 'pushing');
    // Still in the running column — `pushing` rolls up into "running".
    await expect(page.getByTestId(TestIds.Board.columnCount('running'))).toHaveText('1');

    // ── 3b. PR opened — chip shows up with parsed PR number ─────────────
    await emitPr(
      page,
      0,
      'https://github.com/acme/widgets/pull/42',
      'nightcoder/auto-merge-test-feature',
    );
    const prChip = page.getByTestId(TestIds.TaskCard.prChip(0));
    await expect(prChip).toBeVisible();
    await expect(prChip).toHaveText(/PR #42/);

    // ── 3c. Auto-merge phase: merging → polling → merged ────────────────
    await emitStatus(page, 0, 'merging');
    // Card is still considered "active" while merging — stays in running col.
    await expect(page.getByTestId(TestIds.Board.columnCount('running'))).toHaveText('1');
    await expect(page.getByTestId(TestIds.TaskCard.statusBadge(0))).toContainText('merging');

    await emitAutoMerge(page, 0, 'polling', 'BLOCKED');
    await emitAutoMerge(page, 0, 'merged');

    await emitStatus(page, 0, 'merged');

    // ── 4. Final state: card landed in Done with the merged badge ───────
    await expect(page.getByTestId(TestIds.Board.columnCount('done'))).toHaveText('1');
    await expect(page.getByTestId(TestIds.Board.columnCount('running'))).toHaveText('0');
    await expect(page.getByTestId(TestIds.TaskCard.statusBadge(0))).toContainText('merged');
    // PR chip is still present so the user can click through to the merged PR.
    await expect(page.getByTestId(TestIds.TaskCard.prChip(0))).toBeVisible();
  });

  test('default flow (review required) stops at the Review column instead of merging', async ({
    page,
  }) => {
    await installMockIpc(page, {
      initialState: {
        folder: { kind: 'selected', path: '/repo', isGitRepo: true, hasOrigin: true },
      },
    });
    await page.goto('/');

    // Same dialog, but leave "Requires human review" CHECKED (the default).
    await page.getByTestId(TestIds.SubBar.addTaskBtn).click();
    await page.getByTestId(TestIds.AddTaskDialog.titleInput).fill('Review-required feature');
    await page.getByTestId(TestIds.AddTaskDialog.descriptionInput).fill('Stop at review.');
    await expect(
      page.getByTestId(TestIds.AddTaskDialog.requiresReviewCheckbox),
    ).toBeChecked();
    await page.getByTestId(TestIds.AddTaskDialog.submitBtn).click();

    await page.getByTestId(TestIds.TaskCard.runBtn(0)).click();
    await emitStatus(page, 0, 'running');
    await emitBranch(page, 0, 'nightcoder/review-required-feature');
    await emitStatus(page, 0, 'pushing');
    await emitPr(
      page,
      0,
      'https://github.com/acme/widgets/pull/7',
      'nightcoder/review-required-feature',
    );

    // With review required, the orchestrator transitions to `review` (no
    // `merging`/`merged` events are emitted) and the card moves to the
    // Review column.
    await emitStatus(page, 0, 'review');

    await expect(page.getByTestId(TestIds.Board.columnCount('review'))).toHaveText('1');
    await expect(page.getByTestId(TestIds.Board.columnCount('done'))).toHaveText('0');
    await expect(page.getByTestId(TestIds.TaskCard.prChip(0))).toBeVisible();
  });
});
