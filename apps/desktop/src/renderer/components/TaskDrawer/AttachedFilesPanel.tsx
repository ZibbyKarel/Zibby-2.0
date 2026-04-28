import React, { useCallback, useEffect, useState } from 'react';
import type { TaskFile } from '@nightcoder/shared-types/ipc';
import {
  Button,
  Card,
  Container,
  Icon,
  IconButton,
  IconName,
  Stack,
  Text,
} from '@nightcoder/design-system';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function AttachedFilesPanel({ taskId }: { taskId: string }) {
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
    <Stack direction="column" gap="100">
      {loading ? (
        <Text size="sm" tone="faint">
          Loading…
        </Text>
      ) : files.length === 0 ? (
        <Text size="sm" tone="faint">
          No files attached yet.
        </Text>
      ) : (
        <Stack direction="column" gap="50">
          {files.map((f) => (
            <Card
              key={f.name}
              variant="outlined"
              background="bg2"
              radius="sm"
              padding={['75', '100']}
            >
              <Stack direction="row" align="center" gap="100">
                <Icon value={IconName.File} size="sm" />
                <Container grow minWidth={0} title={f.name}>
                  <Text size="sm" mono tone="muted" truncate>
                    {f.name}
                  </Text>
                </Container>
                <Text size="xs" mono tone="faint">
                  {formatBytes(f.size)}
                </Text>
                <IconButton
                  aria-label={`Remove ${f.name}`}
                  title="Remove"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  icon={IconName.Trash}
                  onClick={() => void onRemove(f.name)}
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
          onClick={() => void onAdd()}
          disabled={busy}
        />
      </Stack>
      {error && (
        <Text size="xs" tone="rose">
          {error}
        </Text>
      )}
    </Stack>
  );
}
