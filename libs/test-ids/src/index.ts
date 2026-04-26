/**
 * Single source of truth for `data-testid` strings used by the renderer.
 *
 * Both the React renderer and tests (Playwright e2e + Vitest component tests)
 * import from `@nightcoder/test-ids` so that an id rename is a one-line change
 * that the type-checker propagates everywhere. Plain string constants only —
 * keep this lib free of React/DOM/test-runner imports so it stays usable from
 * a Node-only Playwright runner.
 */

/** Convention prefix. Anything matching `nc-*` is a test hook, not styling. */
export const TEST_ID_PREFIX = 'nc' as const;

/* ─── Top bar (header) ───────────────────────────────────────────── */

export const TopBarTestIds = {
  root:           'nc-topbar',
  brand:          'nc-topbar-brand',
  pickFolderBtn:  'nc-topbar-pick-folder',
  changeFolderBtn:'nc-topbar-change-folder',
  folderPath:     'nc-topbar-folder-path',
  searchInput:    'nc-topbar-search',
  themeToggle:    'nc-topbar-theme-toggle',
} as const;

/* ─── Sub bar (filters / global actions) ─────────────────────────── */

export const SubBarTestIds = {
  root:               'nc-subbar',
  taskCount:          'nc-subbar-task-count',
  filterInterrupted:  'nc-subbar-filter-interrupted',
  filterCancelledErr: 'nc-subbar-filter-cancelled-error',
  filterPending:      'nc-subbar-filter-pending',
  syncBtn:            'nc-subbar-sync',
  addTaskBtn:         'nc-subbar-add-task',
  runAllBtn:          'nc-subbar-run-all',
} as const;

/* ─── Board / Column ─────────────────────────────────────────────── */

export type ColumnId = 'queue' | 'running' | 'review' | 'done';

export const BoardTestIds = {
  root: 'nc-board',
  /** `data-testid` for a column wrapper, e.g. `nc-column-queue`. */
  column:      (id: ColumnId): string => `nc-column-${id}`,
  /** Element rendering the per-column task count badge. */
  columnCount: (id: ColumnId): string => `nc-column-${id}-count`,
  /** Empty-state placeholder (`drop tasks here`). */
  columnEmpty: (id: ColumnId): string => `nc-column-${id}-empty`,
} as const;

/* ─── Task card ──────────────────────────────────────────────────── */

export const TaskCardTestIds = {
  /** A single card. Identified by 0-based story index. */
  root:         (index: number): string => `nc-task-card-${index}`,
  /** Per-card test ids, all keyed by story index. */
  title:        (index: number): string => `nc-task-card-${index}-title`,
  description:  (index: number): string => `nc-task-card-${index}-description`,
  runBtn:       (index: number): string => `nc-task-card-${index}-run`,
  resumeBtn:    (index: number): string => `nc-task-card-${index}-resume`,
  deleteBtn:    (index: number): string => `nc-task-card-${index}-delete`,
  editBtn:      (index: number): string => `nc-task-card-${index}-edit`,
  statusBadge:  (index: number): string => `nc-task-card-${index}-status`,
  prChip:       (index: number): string => `nc-task-card-${index}-pr`,
} as const;

/* ─── Task drawer (detail pane) ──────────────────────────────────── */

export type DrawerTabId = 'logs' | 'diff' | 'details';

export const DrawerTestIds = {
  root:        'nc-drawer',
  closeBtn:    'nc-drawer-close',
  runBtn:      'nc-drawer-run',
  title:       'nc-drawer-title',
  /** Tab triggers + panels. */
  tab:         (id: DrawerTabId): string => `nc-drawer-tab-${id}`,
  panel:       (id: DrawerTabId): string => `nc-drawer-panel-${id}`,
  /** Logs tab. */
  logsEmpty:   'nc-drawer-logs-empty',
  logLine:     (lineNumber: number): string => `nc-drawer-log-line-${lineNumber}`,
  /** Diff tab. */
  diffRefreshBtn: 'nc-drawer-diff-refresh',
  diffMergeBtn:   'nc-drawer-diff-merge',
  /** Details tab. */
  detailsEditBtn:    'nc-drawer-details-edit',
  detailsTitle:      'nc-drawer-details-title',
  detailsDescription:'nc-drawer-details-description',
  detailsAcceptance: 'nc-drawer-details-acceptance',
  detailsModel:      'nc-drawer-details-model',
  detailsSaveBtn:    'nc-drawer-details-save',
  detailsCancelBtn:  'nc-drawer-details-cancel',
} as const;

/* ─── Add-task dialog ────────────────────────────────────────────── */

export const AddTaskDialogTestIds = {
  root:           'nc-add-task-dialog',
  closeBtn:       'nc-add-task-close',
  titleInput:     'nc-add-task-title',
  descriptionInput:'nc-add-task-description',
  acceptanceInput:'nc-add-task-acceptance',
  blockerSelect:  'nc-add-task-blocker',
  attachFilesBtn: 'nc-add-task-attach-files',
  submitBtn:      'nc-add-task-submit',
  cancelBtn:      'nc-add-task-cancel',
  /** Phase-model rows. */
  phaseModelSelect:    (key: 'planning' | 'implementation' | 'qa'): string =>
    `nc-add-task-phase-${key}-model`,
  phaseThinkingSelect: (key: 'planning' | 'implementation' | 'qa'): string =>
    `nc-add-task-phase-${key}-thinking`,
} as const;

/* ─── Command palette ────────────────────────────────────────────── */

export const CommandPaletteTestIds = {
  root:       'nc-command-palette',
  input:      'nc-command-palette-input',
  /** Identified by command id. */
  item:       (commandId: string): string => `nc-command-palette-item-${commandId}`,
  empty:      'nc-command-palette-empty',
} as const;

/* ─── Toasts ─────────────────────────────────────────────────────── */

export const ToastTestIds = {
  /** The fixed-position toast region. */
  region: 'nc-toast-region',
  /** A single toast row, keyed by toast id. */
  toast:  (id: string): string => `nc-toast-${id}`,
} as const;

/* ─── Usage panel ────────────────────────────────────────────────── */

export const UsagePanelTestIds = {
  root:     'nc-usage-panel',
  fiveHour: 'nc-usage-five-hour',
  weekly:   'nc-usage-weekly',
} as const;

/* ─── Aggregate export ───────────────────────────────────────────── */

/**
 * Convenience re-export. Tests can import the whole namespace:
 *
 * ```ts
 * import { TestIds } from '@nightcoder/test-ids';
 * page.getByTestId(TestIds.SubBar.runAllBtn).click();
 * ```
 */
export const TestIds = {
  TopBar:            TopBarTestIds,
  SubBar:            SubBarTestIds,
  Board:             BoardTestIds,
  TaskCard:          TaskCardTestIds,
  Drawer:            DrawerTestIds,
  AddTaskDialog:     AddTaskDialogTestIds,
  CommandPalette:    CommandPaletteTestIds,
  Toast:             ToastTestIds,
  UsagePanel:        UsagePanelTestIds,
} as const;

export type TestIdsType = typeof TestIds;
