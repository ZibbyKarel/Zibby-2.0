import { Button, IconName } from '@nightcoder/design-system';
import { useWatch } from '@nightcoder/form';
import { TestIds } from '@nightcoder/test-ids';
import type { AddTaskFormValues } from './types';

export function DialogActions({ onClose }: { onClose: () => void }) {
  const description = useWatch<AddTaskFormValues, 'description'>({
    name: 'description',
  });
  const canAdd = (description ?? '').trim().length > 0;

  return (
    <>
      <Button
        variant="ghost"
        label="Cancel"
        onClick={onClose}
        data-testid={TestIds.AddTaskDialog.cancelBtn}
      />
      <Button
        type="submit"
        variant="primary"
        label="Add task"
        startIcon={IconName.Check}
        disabled={!canAdd}
        data-testid={TestIds.AddTaskDialog.submitBtn}
      />
    </>
  );
}
