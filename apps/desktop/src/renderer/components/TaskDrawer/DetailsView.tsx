import React, { useCallback, useEffect, useState } from 'react';
import type { TaskFile } from '@nightcoder/shared-types/ipc';
import {
  Button,
  Chip,
  Icon,
  IconButton,
  IconName,
  Select,
  Stack,
  Surface,
  Text,
  TextField,
  Textarea,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import { fmtNum } from '../primitives';
import type { TaskVM } from '../../viewModel';
import type { SaveData } from './types';

// ── Section / KV helpers ─────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Surface direction="column" gap={8}>
      <Text as="h3" size="xs" weight="semibold" tone="faint" tracking="wider" transform="uppercase">
        {label}
      </Text>
      {children}
    </Surface>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <Surface bordered radius="sm" background="bg2" paddingX={10} paddingY={8} direction="column" gap={2}>
      <Text size="xs" tone="faint" tracking="wider" transform="uppercase">{k}</Text>
      <Text size="sm" mono={mono}>{v}</Text>
    </Surface>
  );
}

// ── AttachedFilesPanel ───────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function AttachedFilesPanel({ taskId }: { taskId: string }) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    const res = await window.nightcoder.listTaskFiles({ taskId });
    if (res.kind === 'error') {
      setError(res.message);
      setFiles([]);
    } else {
      setFiles(res.files);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const onAdd = async () => {
    setError(null);
    const pick = await window.nightcoder.pickFilesToAttach();
    if (pick.kind === 'cancelled') return;
    setBusy(true);
    try {
      const res = await window.nightcoder.addTaskFiles({
        taskId,
        sourcePaths: pick.paths,
      });
      if (res.kind === 'error') {
        setError(res.message);
      } else {
        setFiles(res.files);
      }
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (name: string) => {
    setError(null);
    setBusy(true);
    try {
      const res = await window.nightcoder.removeTaskFile({ taskId, name });
      if (res.kind === 'error') {
        setError(res.message);
      } else {
        setFiles(res.files);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface direction="column" gap={8}>
      {loading ? (
        <Text size="sm" tone="faint">Loading…</Text>
      ) : files.length === 0 ? (
        <Text size="sm" tone="faint">No files attached yet.</Text>
      ) : (
        <Stack direction="column" gap={4}>
          {files.map((f) => (
            <Surface
              key={f.name}
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
              <Surface grow minWidth={0} title={f.name}>
                <Text size="sm" mono tone="muted" truncate>{f.name}</Text>
              </Surface>
              <Text size="xs" mono tone="faint">{formatBytes(f.size)}</Text>
              <IconButton
                aria-label={`Remove ${f.name}`}
                title="Remove"
                size="sm"
                variant="ghost"
                disabled={busy}
                icon={IconName.Trash}
                onClick={() => void onRemove(f.name)}
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
          onClick={() => void onAdd()}
          disabled={busy}
        />
      </Stack>
      {error && <Text size="xs" tone="rose">{error}</Text>}
    </Surface>
  );
}

// ── DetailsView ──────────────────────────────────────────────────────────────

const MODEL_OPTIONS = [
  { value: '', label: 'Sonnet (default)' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

export function DetailsView({
  task,
  onSave,
}: {
  task: TaskVM;
  onSave: (data: SaveData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [acceptance, setAcceptance] = useState(task.acceptance.join('\n'));
  const [model, setModel] = useState(task.model ?? '');

  useEffect(() => {
    setEditing(false);
    setTitle(task.title);
    setDescription(task.description);
    setAcceptance(task.acceptance.join('\n'));
    setModel(task.model ?? '');
  }, [task.index]);

  const handleSave = () => {
    onSave({
      title: title.trim(),
      description: description.trim(),
      acceptance: acceptance
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      model: model || undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description);
    setAcceptance(task.acceptance.join('\n'));
    setModel(task.model ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <Surface padding={18} direction="column" gap={14}>
        <TextField
          label="Title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid={TestIds.Drawer.detailsTitle}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          data-testid={TestIds.Drawer.detailsDescription}
        />
        <Textarea
          label="Acceptance criteria"
          helperText="one per line"
          value={acceptance}
          onChange={(e) => setAcceptance(e.target.value)}
          rows={4}
          data-testid={TestIds.Drawer.detailsAcceptance}
        />
        <Select
          label="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          options={MODEL_OPTIONS}
          data-testid={TestIds.Drawer.detailsModel}
        />
        <Stack direction="row" justify="end" gap={8}>
          <Button
            variant="ghost"
            label="Cancel"
            onClick={handleCancel}
            data-testid={TestIds.Drawer.detailsCancelBtn}
          />
          <Button
            variant="primary"
            label="Save"
            startIcon={IconName.Check}
            disabled={!title.trim() || !description.trim()}
            onClick={handleSave}
            data-testid={TestIds.Drawer.detailsSaveBtn}
          />
        </Stack>
      </Surface>
    );
  }

  return (
    <Surface padding={18} direction="column" gap={18}>
      <Stack direction="row" justify="end">
        <Button
          size="sm"
          variant="outline"
          label="Edit"
          startIcon={IconName.Edit}
          onClick={() => setEditing(true)}
          data-testid={TestIds.Drawer.detailsEditBtn}
        />
      </Stack>

      <Section label="Description">
        <Text size="md" tone="muted" whitespace="pre-wrap">{task.description}</Text>
      </Section>

      {task.acceptance.length > 0 && (
        <Section label="Acceptance criteria">
          <Stack direction="column" gap={8}>
            {task.acceptance.map((a, i) => (
              <Stack key={i} direction="row" align="start" gap={8}>
                <Surface
                  width={16}
                  height={16}
                  radius="sm"
                  background="bg3"
                  bordered
                  borderTone="strong"
                  direction="row"
                  align="center"
                  justify="center"
                  shrink={false}
                >
                  {task.status === 'done' && (
                    <Icon value={IconName.Check} size="xs" strokeWidth={2.5} />
                  )}
                </Surface>
                <Text size="md" tone="muted">{a}</Text>
              </Stack>
            ))}
          </Stack>
        </Section>
      )}

      {task.affectedFiles.length > 0 && (
        <Section label="Affected files">
          <Stack direction="row" wrap gap={6}>
            {task.affectedFiles.map((f, i) => (
              <Chip key={i}>{f}</Chip>
            ))}
          </Stack>
        </Section>
      )}

      <Section label="Attached files">
        <AttachedFilesPanel taskId={task.taskId} />
      </Section>

      <Surface direction="row" gap={12}>
        <Surface grow>
          <KV k="Model" v={task.model ?? 'Sonnet (default)'} />
        </Surface>
        <Surface grow>
          <KV k="Branch" v={task.branch ?? '—'} mono />
        </Surface>
      </Surface>
      <Surface direction="row" gap={12}>
        <Surface grow>
          <KV k="Status" v={task.status} />
        </Surface>
        <Surface grow>
          <KV
            k="Tokens"
            v={
              task.tokens != null
                ? `↑${fmtNum((task.tokens as { in: number; out: number }).in)}  ↓${fmtNum((task.tokens as { in: number; out: number }).out)}`
                : '—'
            }
            mono
          />
        </Surface>
      </Surface>
    </Surface>
  );
}
