import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Container,
  Icon,
  IconName,
  Kbd,
  Stack,
  Text,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';

export type Command = {
  id: string;
  icon?: IconName;
  label: string;
  hint?: string;
  kbd?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Command[];
};

export function CommandPalette({ open, onClose, commands }: Props) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(''); setSelected(0); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  const matches = useMemo(() => {
    const ql = q.toLowerCase();
    return commands.filter((c) => !ql || c.label.toLowerCase().includes(ql) || c.hint?.toLowerCase().includes(ql));
  }, [q, commands]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((v) => Math.min(v + 1, matches.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); matches[selected]?.run(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, matches, selected, onClose]);

  if (!open) return null;

  return (
    <Container
      position="fixed"
      top={0}
      right={0}
      bottom={0}
      left={0}
      zIndex={70}
      style={{ background: 'rgba(0,0,0,.55)', paddingTop: '12vh' }}
      onClick={onClose}
    >
      <Stack direction="row" align="start" justify="center" style={{ minHeight: '100%' }}>
        <Card
          variant="elevated"
          background="bg1"
          bordered
          borderTone="strong"
          radius="md"
          shadow="2"
          padding="none"
          overflowY="hidden"
          width="min(560px, 94vw)"
          onClick={(e) => e.stopPropagation()}
          data-testid={TestIds.CommandPalette.root}
        >
          <Stack direction="column">
            <Card variant="filled" background="transparent" bordered={{ bottom: true }} radius="none" padding={['150', '150']}>
              <Stack direction="row" align="center" gap="100">
                <Icon value={IconName.Search} size="md" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setSelected(0); }}
                  placeholder="Type a command or search tasks…"
                  className="ds-bare-input"
                  data-testid={TestIds.CommandPalette.input}
                />
                <Kbd>esc</Kbd>
              </Stack>
            </Card>
            <Container maxHeight={360} overflowY="auto" padding={['75', '75']}>
              <Stack direction="column" gap="25">
                {matches.length === 0 && (
                  <Container
                    padding={['300', '250']}
                    data-testid={TestIds.CommandPalette.empty}
                  >
                    <Stack direction="row" justify="center">
                      <Text size="sm" tone="faint">No commands match &quot;{q}&quot;</Text>
                    </Stack>
                  </Container>
                )}
                {matches.map((c, idx) => (
                  <Button
                    key={c.id}
                    variant="surface"
                    type="button"
                    background={idx === selected ? 'bg3' : 'transparent'}
                    radius="sm"
                    padding={['100', '100']}
                    width="100%"
                    textAlign="left"
                    cursor="pointer"
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => { c.run(); onClose(); }}
                    data-testid={TestIds.CommandPalette.item(c.id)}
                  >
                    <Stack direction="row" align="center" gap="100" grow>
                      <Container width={20}>
                        <Stack direction="row" align="center" justify="center">
                          <Icon value={c.icon ?? IconName.ArrowRight} size="sm" />
                        </Stack>
                      </Container>
                      <Stack direction="row" align="center" grow>
                        <Text size="md">{c.label}</Text>
                      </Stack>
                      {c.hint && <Text size="xs" tone="faint">{c.hint}</Text>}
                      {c.kbd && <Kbd>{c.kbd}</Kbd>}
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </Container>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
