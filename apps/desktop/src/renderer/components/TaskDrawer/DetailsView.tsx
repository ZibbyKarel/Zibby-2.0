import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  Container,
  Icon,
  IconName,
  Stack,
  Text,
} from '@nightcoder/design-system';
import {
  Form,
  FormInput,
  FormSelect,
  FormTextarea,
  useWatch,
} from '@nightcoder/form';
import { TestIds } from '@nightcoder/test-ids';
import { fmtNum } from '../primitives';
import type { TaskVM } from '../../viewModel';
import type { SaveData } from './types';
import { Section, KV } from './DetailsPrimitives';
import { AttachedFilesPanel } from './AttachedFilesPanel';

const MODEL_OPTIONS = [
  { value: '', label: 'Sonnet (default)' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

type EditFormValues = {
  title: string;
  description: string;
  acceptance: string;
  model: string;
};

function EditFormBody({ onCancel }: { onCancel: () => void }) {
  const title = useWatch<EditFormValues, 'title'>({ name: 'title' });
  const description = useWatch<EditFormValues, 'description'>({
    name: 'description',
  });
  const isSaveDisabled =
    !(title ?? '').trim() || !(description ?? '').trim();

  return (
    <Container padding={['200', '200']}>
      <Stack direction="column" gap="150">
        <FormInput<EditFormValues>
          name="title"
          label="Title"
          autoFocus
          data-testid={TestIds.Drawer.detailsTitle}
        />
        <FormTextarea<EditFormValues>
          name="description"
          label="Description"
          rows={5}
          data-testid={TestIds.Drawer.detailsDescription}
        />
        <FormTextarea<EditFormValues>
          name="acceptance"
          label="Acceptance criteria"
          helperText="one per line"
          rows={4}
          data-testid={TestIds.Drawer.detailsAcceptance}
        />
        <FormSelect<string, EditFormValues>
          name="model"
          label="Model"
          options={MODEL_OPTIONS}
          data-testid={TestIds.Drawer.detailsModel}
        />
        <Stack direction="row" justify="end" gap="100">
          <Button
            variant="ghost"
            label="Cancel"
            onClick={onCancel}
            data-testid={TestIds.Drawer.detailsCancelBtn}
          />
          <Button
            type="submit"
            variant="primary"
            label="Save"
            startIcon={IconName.Check}
            disabled={isSaveDisabled}
            data-testid={TestIds.Drawer.detailsSaveBtn}
          />
        </Stack>
      </Stack>
    </Container>
  );
}

export function DetailsView({
  task,
  onSave,
}: {
  task: TaskVM;
  onSave: (data: SaveData) => void;
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [task.index]);

  if (editing) {
    return (
      <Form<EditFormValues>
        defaultValues={{
          title: task.title,
          description: task.description,
          acceptance: task.acceptance.join('\n'),
          model: task.model ?? '',
        }}
        onSubmit={(values) => {
          onSave({
            title: values.title.trim(),
            description: values.description.trim(),
            acceptance: values.acceptance
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            model: values.model || undefined,
          });
          setEditing(false);
        }}
        style={{ width: '100%' }}
      >
        <EditFormBody onCancel={() => setEditing(false)} />
      </Form>
    );
  }

  return (
    <Container padding={['200', '200']}>
      <Stack direction="column" gap="200">
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
          <Text size="md" tone="muted" whitespace="pre-wrap">
            {task.description}
          </Text>
        </Section>

        {task.acceptance.length > 0 && (
          <Section label="Acceptance criteria">
            <Stack direction="column" gap="100">
              {task.acceptance.map((a, i) => (
                <Stack key={i} direction="row" align="start" gap="100">
                  <Card
                    variant="outlined"
                    background="bg3"
                    bordered
                    borderTone="strong"
                    radius="sm"
                    padding="none"
                    width={16}
                    height={16}
                    shrink={false}
                  >
                    <Stack direction="row" align="center" justify="center">
                      {task.status === 'done' && (
                        <Icon value={IconName.Check} size="xs" strokeWidth={2.5} />
                      )}
                    </Stack>
                  </Card>
                  <Text size="md" tone="muted">
                    {a}
                  </Text>
                </Stack>
              ))}
            </Stack>
          </Section>
        )}

        {task.affectedFiles.length > 0 && (
          <Section label="Affected files">
            <Stack direction="row" wrap gap="75">
              {task.affectedFiles.map((f, i) => (
                <Chip key={i}>{f}</Chip>
              ))}
            </Stack>
          </Section>
        )}

        <Section label="Attached files">
          <AttachedFilesPanel taskId={task.taskId} />
        </Section>

        <Stack direction="row" gap="150">
          <Stack grow>
            <KV k="Model" v={task.model ?? 'Sonnet (default)'} />
          </Stack>
          <Stack grow>
            <KV k="Branch" v={task.branch ?? '—'} mono />
          </Stack>
        </Stack>
        <Stack direction="row" gap="150">
          <Stack grow>
            <KV k="Status" v={task.status} />
          </Stack>
          <Stack grow>
            <KV
              k="Tokens"
              v={
                task.tokens != null
                  ? `↑${fmtNum((task.tokens as { in: number; out: number }).in)}  ↓${fmtNum((task.tokens as { in: number; out: number }).out)}`
                  : '—'
              }
              mono
            />
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
