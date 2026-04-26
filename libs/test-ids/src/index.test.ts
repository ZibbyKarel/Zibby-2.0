import { describe, expect, it } from 'vitest';
import {
  AddTaskDialogTestIds,
  BoardTestIds,
  CommandPaletteTestIds,
  DrawerTestIds,
  SubBarTestIds,
  TEST_ID_PREFIX,
  TaskCardTestIds,
  TestIds,
  ToastTestIds,
  TopBarTestIds,
  UsagePanelTestIds,
} from './index';

describe('@nightcoder/test-ids', () => {
  it('namespaces every id under the shared prefix', () => {
    const collect = (obj: Record<string, unknown>): string[] => {
      const out: string[] = [];
      for (const value of Object.values(obj)) {
        if (typeof value === 'string') out.push(value);
        if (typeof value === 'function') {
          // sample function-style ids with a dummy arg
          const v = (value as (x: never) => string)('sample' as never);
          if (typeof v === 'string') out.push(v);
        }
      }
      return out;
    };
    const buckets = [
      TopBarTestIds,
      SubBarTestIds,
      BoardTestIds,
      TaskCardTestIds,
      DrawerTestIds,
      AddTaskDialogTestIds,
      CommandPaletteTestIds,
      ToastTestIds,
      UsagePanelTestIds,
    ];
    for (const bucket of buckets) {
      const ids = collect(bucket as Record<string, unknown>);
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(id.startsWith(`${TEST_ID_PREFIX}-`)).toBe(true);
      }
    }
  });

  it('exposes every bucket under the aggregate TestIds export', () => {
    expect(TestIds.TopBar).toBe(TopBarTestIds);
    expect(TestIds.SubBar).toBe(SubBarTestIds);
    expect(TestIds.Board).toBe(BoardTestIds);
    expect(TestIds.TaskCard).toBe(TaskCardTestIds);
    expect(TestIds.Drawer).toBe(DrawerTestIds);
    expect(TestIds.AddTaskDialog).toBe(AddTaskDialogTestIds);
    expect(TestIds.CommandPalette).toBe(CommandPaletteTestIds);
    expect(TestIds.Toast).toBe(ToastTestIds);
    expect(TestIds.UsagePanel).toBe(UsagePanelTestIds);
  });

  it('parameterised builders return distinct ids per arg', () => {
    expect(BoardTestIds.column('queue')).toBe('nc-column-queue');
    expect(BoardTestIds.column('done')).toBe('nc-column-done');
    expect(TaskCardTestIds.runBtn(0)).not.toBe(TaskCardTestIds.runBtn(1));
    expect(DrawerTestIds.tab('logs')).toMatch(/logs$/);
  });
});
