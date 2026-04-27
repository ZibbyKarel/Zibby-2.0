import React, { useEffect, useRef, useState } from 'react';
import type { PhaseModels, PhaseModel } from '@nightcoder/shared-types/ipc';
import {
  Button,
  Icon,
  IconButton,
  IconName,
  Stack,
  Surface,
  Text,
  Textarea,
} from '@nightcoder/design-system';
import { Form, FormInput, FormTextarea } from '@nightcoder/form';
import { Controller } from 'react-hook-form';
import { TestIds } from '@nightcoder/test-ids';
import type {
  NewTaskData,
  BlockerOption,
  PhaseKey,
  AddTaskFormValues,
} from './types';
import { DRAG_MIME, basename, TreeList } from './FileTree';
import { ModelPick } from './ModelPick';
import { BlockedByPicker } from './BlockedByPicker';
import { ReviewCard } from './ReviewCard';
import { mergeRefs } from './utils';
import {
  setPhase,
  pickFiles,
  removeFile,
  insertAtCaret,
  handleDescriptionDrop,
} from './formActions';
import { useRepoTree } from './hooks/useRepoTree';
import { useFileTreeUI } from './hooks/useFileTreeUI';
import type { UseFormReturn } from 'react-hook-form';

const PHASES: readonly { key: PhaseKey; label: string; icon: IconName }[] = [
  { key: 'planning', label: 'Plan', icon: IconName.ScrollText },
  { key: 'implementation', label: 'Code', icon: IconName.Zap },
  { key: 'qa', label: 'QA', icon: IconName.Check },
];

const FORM_DEFAULTS: AddTaskFormValues = {
  title: '',
  description: '',
  acceptance: '',
  requiresHumanReview: true,
  phaseModels: {},
  blockerTaskIds: [],
  attachedFilePaths: [],
};

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
  const formRef = useRef<UseFormReturn<AddTaskFormValues>>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const {
    tree,
    loading: treeLoading,
    error: treeError,
  } = useRepoTree(open, folderPath);
  const treeUI = useFileTreeUI(tree);

  useEffect(() => {
    if (!open) return;
    formRef.current?.reset(FORM_DEFAULTS);
    setPickError(null);
    treeUI.reset();
    // treeUI is a new object each render; we only want this on open toggle
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
    <Surface
      onClick={onClose}
      position="fixed"
      top={0}
      right={0}
      bottom={0}
      left={0}
      zIndex={60}
      background="backdrop"
      direction="row"
      align="center"
      justify="center"
    >
      <Surface
        onClick={(e) => e.stopPropagation()}
        width="min(820px, 96vw)"
        maxHeight="92vh"
        background="bg1"
        bordered
        borderTone="strong"
        radius="md"
        shadow="2"
        direction="column"
        data-testid={TestIds.AddTaskDialog.root}
      >
        <Surface
          as="header"
          bordered={{ bottom: true }}
          paddingX={20}
          paddingTop={16}
          paddingBottom={14}
          direction="row"
          align="center"
          gap={10}
        >
          <Surface
            background="accentSoft"
            radius="sm"
            width={32}
            height={32}
            direction="row"
            align="center"
            justify="center"
          >
            <Icon value={IconName.Plus} size="md" />
          </Surface>
          <Text as="h2" size="lg" weight="semibold">
            New task
          </Text>
          <Surface grow />
          <IconButton
            aria-label="Close"
            size="sm"
            variant="ghost"
            icon={IconName.X}
            onClick={onClose}
            data-testid={TestIds.AddTaskDialog.closeBtn}
          />
        </Surface>

        <Form<AddTaskFormValues>
          formRef={formRef}
          defaultValues={FORM_DEFAULTS}
          onSubmit={handleFormSubmit}
          style={{ display: 'contents' }}
        >
          {(methods) => {
            const canAdd = methods.watch('description').trim().length > 0;
            const phaseModels = methods.watch('phaseModels');
            const attachedFilePaths = methods.watch('attachedFilePaths');

            return (
              <>
                <Surface
                  grow
                  minHeight={0}
                  overflowY="auto"
                  paddingX={20}
                  paddingTop={18}
                  paddingBottom={20}
                  direction="column"
                  gap={14}
                >
                  <FormInput<AddTaskFormValues>
                    name="title"
                    label="Title"
                    helperText="optional — inferred from description if empty"
                    placeholder="What should the agent do?"
                    data-testid={TestIds.AddTaskDialog.titleInput}
                  />

                  <Surface direction="column" gap={6}>
                    <Surface direction="row" align="center" gap={6}>
                      <Text
                        size="xs"
                        weight="medium"
                        tone="muted"
                        tracking="wide"
                      >
                        Description / brief{' '}
                        <Text as="span" size="xs" tone="rose">
                          *
                        </Text>
                      </Text>
                      <Text size="xs" tone="faint" italic>
                        {treeUI.showTree
                          ? '· drag files from the tree to insert @path'
                          : '· click the tree icon to show the file tree'}
                      </Text>
                    </Surface>
                    <Surface direction="row" align="stretch" gap={10}>
                      <Surface grow minWidth={0} position="relative">
                        <Controller
                          name="description"
                          control={methods.control}
                          render={({
                            field: { ref, onChange, ...fieldProps },
                          }) => (
                            <Textarea
                              {...fieldProps}
                              ref={mergeRefs(ref, descriptionRef)}
                              required
                              autoFocus
                              invalid={treeUI.dropActive}
                              onChange={onChange}
                              onDragOver={(e) => {
                                if (
                                  e.dataTransfer.types.includes(DRAG_MIME) ||
                                  e.dataTransfer.types.includes('text/plain')
                                ) {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                  treeUI.setDropActive(true);
                                }
                              }}
                              onDragLeave={() => treeUI.setDropActive(false)}
                              onDrop={(e) =>
                                handleDescriptionDrop(
                                  e,
                                  methods,
                                  descriptionRef,
                                  treeUI.setDropActive,
                                )
                              }
                              placeholder="Describe the work. Drag files from the tree to reference them with @path."
                              rows={6}
                              data-testid={
                                TestIds.AddTaskDialog.descriptionInput
                              }
                            />
                          )}
                        />
                      </Surface>

                      {treeUI.showTree ? (
                        <Surface
                          width={240}
                          shrink={false}
                          background="bg0"
                          bordered
                          radius="sm"
                          direction="column"
                          overflowY="hidden"
                        >
                          <Surface
                            bordered={{ bottom: true }}
                            paddingX={10}
                            paddingTop={6}
                            paddingBottom={6}
                            direction="row"
                            align="center"
                            gap={6}
                            background="bg1"
                          >
                            <Icon value={IconName.Folder} size="xs" />
                            <Surface grow minWidth={0}>
                              <Text size="xs" mono tone="muted" truncate>
                                {folderPath ? basename(folderPath) : 'project'}
                              </Text>
                            </Surface>
                            <IconButton
                              aria-label="Hide file tree"
                              size="sm"
                              variant="ghost"
                              icon={IconName.X}
                              onClick={() => treeUI.setShowTree(false)}
                            />
                          </Surface>
                          <Surface
                            bordered={{ bottom: true }}
                            paddingX={8}
                            paddingTop={6}
                            paddingBottom={6}
                            background="bg1"
                            direction="row"
                            align="center"
                            gap={6}
                          >
                            <Icon value={IconName.Search} size="xs" />
                            <input
                              value={treeUI.treeFilter}
                              onChange={(e) =>
                                treeUI.setTreeFilter(e.target.value)
                              }
                              placeholder="Filter files…"
                              aria-label="Filter files"
                              className="ds-bare-input ds-mono"
                            />
                            {treeUI.treeFilter && (
                              <IconButton
                                aria-label="Clear filter"
                                size="sm"
                                variant="ghost"
                                icon={IconName.X}
                                onClick={() => treeUI.setTreeFilter('')}
                              />
                            )}
                          </Surface>
                          <Surface
                            grow
                            overflowY="auto"
                            paddingX={4}
                            paddingTop={6}
                            paddingBottom={8}
                            minHeight={0}
                          >
                            {!folderPath && (
                              <Surface paddingX={10} paddingY={8}>
                                <Text size="xs" tone="faint">
                                  Pick a folder to see its file tree.
                                </Text>
                              </Surface>
                            )}
                            {folderPath && treeLoading && (
                              <Surface paddingX={10} paddingY={8}>
                                <Text size="xs" tone="faint">
                                  Loading…
                                </Text>
                              </Surface>
                            )}
                            {folderPath && treeError && (
                              <Surface paddingX={10} paddingY={8}>
                                <Text size="xs" tone="rose">
                                  Couldn&apos;t load tree: {treeError}
                                </Text>
                              </Surface>
                            )}
                            {folderPath &&
                              !treeLoading &&
                              !treeError &&
                              treeUI.filteredTree.length === 0 && (
                                <Surface paddingX={10} paddingY={8}>
                                  <Text size="xs" tone="faint">
                                    {treeUI.treeFilter
                                      ? 'No files match.'
                                      : 'No files found.'}
                                  </Text>
                                </Surface>
                              )}
                            {folderPath && treeUI.filteredTree.length > 0 && (
                              <TreeList
                                nodes={treeUI.filteredTree}
                                depth={0}
                                expanded={treeUI.effectiveExpanded}
                                onToggle={treeUI.toggleDir}
                              />
                            )}
                          </Surface>
                        </Surface>
                      ) : (
                        <button
                          onClick={() => treeUI.setShowTree(true)}
                          title="Show file tree"
                          aria-label="Show file tree"
                          className="ds-tree-toggle-btn"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            flexShrink: 0,
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            color: 'var(--text-3)',
                            cursor: 'pointer',
                          }}
                        >
                          <Icon value={IconName.Folder} size="sm" />
                        </button>
                      )}
                    </Surface>
                  </Surface>

                  <FormTextarea<AddTaskFormValues>
                    name="acceptance"
                    label="Acceptance criteria"
                    helperText="one per line, optional"
                    placeholder={'Column drag works\nCounts are correct'}
                    rows={3}
                    data-testid={TestIds.AddTaskDialog.acceptanceInput}
                  />

                  <Surface direction="column" gap={6}>
                    <Surface direction="column" gap={2}>
                      <Text
                        size="xs"
                        weight="medium"
                        tone="muted"
                        tracking="wide"
                      >
                        Blocked by
                      </Text>
                      <Text size="xs" tone="faint" italic>
                        task will wait until selected dependencies finish
                      </Text>
                    </Surface>
                    <Controller
                      name="blockerTaskIds"
                      control={methods.control}
                      render={({ field }) => (
                        <BlockedByPicker
                          options={blockerOptions ?? []}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Surface>

                  <Surface direction="column" gap={6}>
                    <Text
                      size="xs"
                      weight="medium"
                      tone="muted"
                      tracking="wide"
                    >
                      Review
                    </Text>
                    <Controller
                      name="requiresHumanReview"
                      control={methods.control}
                      render={({ field }) => (
                        <ReviewCard
                          checked={field.value as boolean}
                          onChange={field.onChange}
                          data-testid={
                            TestIds.AddTaskDialog.requiresReviewCheckbox
                          }
                        />
                      )}
                    />
                  </Surface>

                  <Surface as="section" direction="column" gap={8}>
                    <Surface direction="column" gap={2}>
                      <Text
                        size="xs"
                        weight="medium"
                        tone="muted"
                        tracking="wide"
                      >
                        Agents
                      </Text>
                      <Text size="xs" tone="faint" italic>
                        pick the model and thinking depth for each phase
                      </Text>
                    </Surface>
                    <Surface direction="row" gap={8}>
                      {PHASES.map(({ key, label, icon }) => {
                        const cur = (phaseModels as PhaseModels)[key] ?? {};
                        return (
                          <ModelPick
                            key={key}
                            label={label}
                            icon={icon as unknown as string}
                            model={cur.model ?? ''}
                            onModelChange={(m) =>
                              setPhase(methods, key, { model: m || undefined })
                            }
                            thinking={cur.thinking ?? 'off'}
                            onThinkingChange={(t) =>
                              setPhase(methods, key, { thinking: t })
                            }
                            modelSelectTestId={TestIds.AddTaskDialog.phaseModelSelect(
                              key,
                            )}
                            thinkingSelectTestId={TestIds.AddTaskDialog.phaseThinkingSelect(
                              key,
                            )}
                          />
                        );
                      })}
                    </Surface>
                  </Surface>

                  <Surface direction="column" gap={6}>
                    <Surface direction="row" align="center" gap={6}>
                      <Text
                        size="xs"
                        weight="medium"
                        tone="muted"
                        tracking="wide"
                      >
                        Attached files
                      </Text>
                      <Text size="xs" tone="faint" italic>
                        · copied into .nightcoder/tasks/&lt;id&gt;/files —
                        shared with the agent
                      </Text>
                    </Surface>
                    <Surface direction="column" gap={8}>
                      {(attachedFilePaths as string[]).length > 0 && (
                        <Stack direction="column" gap={4}>
                          {(attachedFilePaths as string[]).map((p) => (
                            <Surface
                              key={p}
                              bordered
                              radius="sm"
                              background="bg2"
                              paddingX={8}
                              paddingY={6}
                              direction="row"
                              align="center"
                              gap={8}
                            >
                              <Icon value={IconName.File} size="sm" />
                              <Surface grow minWidth={0} title={p}>
                                <Text size="sm" mono tone="muted" truncate>
                                  {basename(p)}
                                </Text>
                              </Surface>
                              <IconButton
                                aria-label={`Remove ${basename(p)}`}
                                title="Remove"
                                size="sm"
                                variant="ghost"
                                icon={IconName.X}
                                onClick={() => removeFile(methods, p)}
                              />
                            </Surface>
                          ))}
                        </Stack>
                      )}
                      <Stack direction="row">
                        <Button
                          size="sm"
                          variant="secondary"
                          label="Attach files"
                          startIcon={IconName.Paperclip}
                          onClick={() => void pickFiles(methods, setPickError)}
                          data-testid={TestIds.AddTaskDialog.attachFilesBtn}
                        />
                      </Stack>
                      {pickError && (
                        <Text size="xs" tone="rose">
                          {pickError}
                        </Text>
                      )}
                    </Surface>
                  </Surface>
                </Surface>

                <Surface
                  as="footer"
                  bordered={{ top: true }}
                  paddingX={20}
                  paddingTop={14}
                  paddingBottom={16}
                  direction="row"
                  align="center"
                  justify="end"
                  gap={8}
                >
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
                </Surface>
              </>
            );
          }}
        </Form>
      </Surface>
    </Surface>
  );
}
