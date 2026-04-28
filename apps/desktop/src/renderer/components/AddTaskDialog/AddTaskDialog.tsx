import { useEffect, useState } from 'react';
import { Dialog } from '@nightcoder/design-system';
import { Form } from '@nightcoder/form';
import { TestIds } from '@nightcoder/test-ids';
import type { NewTaskData, BlockerOption, AddTaskFormValues } from './types';
import { FORM_DEFAULTS } from './constants';
import { useRepoTree } from './hooks/useRepoTree';
import { useFileTreeUI } from './hooks/useFileTreeUI';
import { DialogContent } from './DialogContent';
import { DialogActions } from './DialogActions';

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (data: NewTaskData) => void;
  folderPath?: string | null;
  blockerOptions?: readonly BlockerOption[];
};

export function AddTaskDialog({
  open,
  onClose,
  onAdd,
  folderPath,
  blockerOptions,
}: Props) {
  const [pickError, setPickError] = useState<string | null>(null);

  const {
    tree,
    loading: treeLoading,
    error: treeError,
  } = useRepoTree(open, folderPath);
  const treeUI = useFileTreeUI(tree);

  useEffect(() => {
    if (!open) return;
    setPickError(null);
    treeUI.reset();
    // treeUI is a new object each render; we only want this on open toggle
  }, [open]);

  const handleFormSubmit = (values: AddTaskFormValues) => {
    onAdd({
      title:
        values.title.trim() ||
        values.description.trim().split(' ').slice(0, 6).join(' '),
      description: values.description.trim(),
      acceptance: values.acceptance
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      model: values.phaseModels.implementation?.model || undefined,
      attachedFilePaths: values.attachedFilePaths,
      phaseModels:
        Object.keys(values.phaseModels).length > 0
          ? values.phaseModels
          : undefined,
      blockerTaskIds:
        values.blockerTaskIds.length > 0 ? values.blockerTaskIds : undefined,
      requiresHumanReview: values.requiresHumanReview,
    });
  };

  if (!open) return null;

  return (
    <Form<AddTaskFormValues>
      defaultValues={FORM_DEFAULTS}
      onSubmit={handleFormSubmit}
    >
      <Dialog
        open
        onClose={onClose}
        title="New task"
        width="min(820px, 96vw)"
        data-testid={TestIds.AddTaskDialog.root}
        actions={<DialogActions onClose={onClose} />}
      >
        <DialogContent
          folderPath={folderPath}
          blockerOptions={blockerOptions}
          tree={tree}
          treeLoading={treeLoading}
          treeError={treeError}
          treeUI={treeUI}
          pickError={pickError}
          setPickError={setPickError}
        />
      </Dialog>
    </Form>
  );
}
