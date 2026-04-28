import { useRef } from 'react';
import type { PhaseModels } from '@nightcoder/shared-types/ipc';
import {
  Button,
  Card,
  Container,
  Icon,
  IconButton,
  IconName,
  Stack,
  Text,
  Textarea,
} from '@nightcoder/design-system';
import {
  Controller,
  FormInput,
  FormTextarea,
  useFormContext,
  useWatch,
} from '@nightcoder/form';
import { TestIds } from '@nightcoder/test-ids';
import type { AddTaskFormValues, BlockerOption } from './types';
import { DRAG_MIME, basename, TreeList } from './FileTree/FileTree';
import { ModelPick } from './ModelPick';
import { BlockedByPicker } from './BlockedByPicker';
import { ReviewCard } from './ReviewCard';
import { mergeRefs } from './utils';
import {
  setPhase,
  pickFiles,
  removeFile,
  handleDescriptionDrop,
} from './formActions';
import type { useRepoTree } from './hooks/useRepoTree';
import type { useFileTreeUI } from './hooks/useFileTreeUI';
import { PHASES } from './constants';

export type DialogContentProps = {
  folderPath?: string | null;
  blockerOptions?: readonly BlockerOption[];
  tree: ReturnType<typeof useRepoTree>['tree'];
  treeLoading: boolean;
  treeError: string | null;
  treeUI: ReturnType<typeof useFileTreeUI>;
  pickError: string | null;
  setPickError: (err: string | null) => void;
};

export function DialogContent({
  folderPath,
  blockerOptions,
  treeLoading,
  treeError,
  treeUI,
  pickError,
  setPickError,
}: DialogContentProps) {
  const methods = useFormContext<AddTaskFormValues>();
  const phaseModels = useWatch<AddTaskFormValues, 'phaseModels'>({
    name: 'phaseModels',
  });
  const attachedFilePaths = useWatch<AddTaskFormValues, 'attachedFilePaths'>({
    name: 'attachedFilePaths',
  });
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <Stack direction="column" gap="150">
      <FormInput<AddTaskFormValues>
        name="title"
        label="Title"
        helperText="optional — inferred from description if empty"
        placeholder="What should the agent do?"
        data-testid={TestIds.AddTaskDialog.titleInput}
      />

      <Stack direction="column" gap="75">
        <Stack direction="row" align="center" gap="75">
          <Text size="xs" weight="medium" tone="muted" tracking="wide">
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
        </Stack>
        <Stack direction="row" align="stretch" gap="100">
          <Container grow minWidth={0} position="relative">
            <Controller
              name="description"
              render={({ field: { ref, onChange, ...fieldProps } }) => (
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
                  data-testid={TestIds.AddTaskDialog.descriptionInput}
                />
              )}
            />
          </Container>

          {treeUI.showTree ? (
            <Card
              variant="outlined"
              background="bg0"
              radius="sm"
              padding="0"
              width={240}
              shrink={false}
              overflowY="hidden"
            >
              <Stack direction="column">
                <Card
                  variant="filled"
                  background="bg1"
                  bordered={{ bottom: true }}
                  radius="none"
                  padding={['75', '100']}
                >
                  <Stack direction="row" align="center" gap="75">
                    <Icon value={IconName.Folder} size="xs" />
                    <Container grow minWidth={0}>
                      <Text size="xs" mono tone="muted" truncate>
                        {folderPath ? basename(folderPath) : 'project'}
                      </Text>
                    </Container>
                    <IconButton
                      aria-label="Hide file tree"
                      size="sm"
                      variant="ghost"
                      icon={IconName.X}
                      onClick={() => treeUI.setShowTree(false)}
                    />
                  </Stack>
                </Card>
                <Card
                  variant="filled"
                  background="bg1"
                  bordered={{ bottom: true }}
                  radius="none"
                  padding={['75', '100']}
                >
                  <Stack direction="row" align="center" gap="75">
                    <Icon value={IconName.Search} size="xs" />
                    <input
                      value={treeUI.treeFilter}
                      onChange={(e) => treeUI.setTreeFilter(e.target.value)}
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
                  </Stack>
                </Card>
                <Container
                  grow
                  overflowY="auto"
                  padding={['75', '50', '100', '50']}
                  minHeight={0}
                >
                  {!folderPath && (
                    <Container padding={['100', '100']}>
                      <Text size="xs" tone="faint">
                        Pick a folder to see its file tree.
                      </Text>
                    </Container>
                  )}
                  {folderPath && treeLoading && (
                    <Container padding={['100', '100']}>
                      <Text size="xs" tone="faint">
                        Loading…
                      </Text>
                    </Container>
                  )}
                  {folderPath && treeError && (
                    <Container padding={['100', '100']}>
                      <Text size="xs" tone="rose">
                        Couldn&apos;t load tree: {treeError}
                      </Text>
                    </Container>
                  )}
                  {folderPath &&
                    !treeLoading &&
                    !treeError &&
                    treeUI.filteredTree.length === 0 && (
                      <Container padding={['100', '100']}>
                        <Text size="xs" tone="faint">
                          {treeUI.treeFilter
                            ? 'No files match.'
                            : 'No files found.'}
                        </Text>
                      </Container>
                    )}
                  {folderPath && treeUI.filteredTree.length > 0 && (
                    <TreeList
                      nodes={treeUI.filteredTree}
                      depth={0}
                      expanded={treeUI.effectiveExpanded}
                      onToggle={treeUI.toggleDir}
                    />
                  )}
                </Container>
              </Stack>
            </Card>
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
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <Icon value={IconName.Folder} size="sm" />
            </button>
          )}
        </Stack>
      </Stack>

      <FormTextarea<AddTaskFormValues>
        name="acceptance"
        label="Acceptance criteria"
        helperText="one per line, optional"
        placeholder={'Column drag works\nCounts are correct'}
        rows={3}
        data-testid={TestIds.AddTaskDialog.acceptanceInput}
      />

      <Stack direction="column" gap="75">
        <Stack direction="column" gap="25">
          <Text size="xs" weight="medium" tone="muted" tracking="wide">
            Blocked by
          </Text>
          <Text size="xs" tone="faint" italic>
            task will wait until selected dependencies finish
          </Text>
        </Stack>
        <Controller
          name="blockerTaskIds"
          render={({ field }) => (
            <BlockedByPicker
              options={blockerOptions ?? []}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Stack>

      <Stack direction="column" gap="75">
        <Text size="xs" weight="medium" tone="muted" tracking="wide">
          Review
        </Text>
        <Controller
          name="requiresHumanReview"
          render={({ field }) => (
            <ReviewCard
              checked={field.value as boolean}
              onChange={field.onChange}
              data-testid={TestIds.AddTaskDialog.requiresReviewCheckbox}
            />
          )}
        />
      </Stack>

      <Stack as="section" direction="column" gap="100">
        <Stack direction="column" gap="25">
          <Text size="xs" weight="medium" tone="muted" tracking="wide">
            Agents
          </Text>
          <Text size="xs" tone="faint" italic>
            pick the model and thinking depth for each phase
          </Text>
        </Stack>
        <Stack direction="row" gap="100">
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
                modelSelectTestId={TestIds.AddTaskDialog.phaseModelSelect(key)}
                thinkingSelectTestId={TestIds.AddTaskDialog.phaseThinkingSelect(
                  key,
                )}
              />
            );
          })}
        </Stack>
      </Stack>

      <Stack direction="column" gap="75">
        <Stack direction="row" align="center" gap="75">
          <Text size="xs" weight="medium" tone="muted" tracking="wide">
            Attached files
          </Text>
          <Text size="xs" tone="faint" italic>
            · copied into .nightcoder/tasks/&lt;id&gt;/files — shared with the
            agent
          </Text>
        </Stack>
        <Stack direction="column" gap="100">
          {(attachedFilePaths as string[]).length > 0 && (
            <Stack direction="column" gap="50">
              {(attachedFilePaths as string[]).map((p) => (
                <Card
                  key={p}
                  variant="outlined"
                  background="bg2"
                  radius="sm"
                  padding={['75', '100']}
                >
                  <Stack direction="row" align="center" gap="100">
                    <Icon value={IconName.File} size="sm" />
                    <Container grow minWidth={0} title={p}>
                      <Text size="sm" mono tone="muted" truncate>
                        {basename(p)}
                      </Text>
                    </Container>
                    <IconButton
                      aria-label={`Remove ${basename(p)}`}
                      title="Remove"
                      size="sm"
                      variant="ghost"
                      icon={IconName.X}
                      onClick={() => removeFile(methods, p)}
                    />
                  </Stack>
                </Card>
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
        </Stack>
      </Stack>
    </Stack>
  );
}
