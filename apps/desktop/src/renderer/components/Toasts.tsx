import React from 'react';
import { Container, Snackbar, Stack, type SnackbarSeverity } from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';

export type Toast = {
  id: string;
  kind: 'info' | 'done' | 'failed';
  title: string;
  desc?: string;
};

type Props = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

const severityFor: Record<Toast['kind'], SnackbarSeverity> = {
  info:   'info',
  done:   'success',
  failed: 'error',
};

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <Container
      position="fixed"
      top={16}
      right={16}
      zIndex={80}
      pointerEvents="none"
      data-testid={TestIds.Toast.region}
    >
      <Stack direction="column" gap="100">
        {toasts.map((t) => (
          <div key={t.id} data-testid={TestIds.Toast.toast(t.id)}>
            <Snackbar
              open
              severity={severityFor[t.kind]}
              title={t.title}
              message={t.desc}
              onClose={() => onDismiss(t.id)}
            />
          </div>
        ))}
      </Stack>
    </Container>
  );
}
