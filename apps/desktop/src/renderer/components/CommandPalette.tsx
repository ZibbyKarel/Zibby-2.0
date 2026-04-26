import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Kbd,
  Stack,
  Surface,
  Text,
} from '@nightcoder/design-system';
import { Icon } from './icons';

export type Command = {
  id: string;
  icon?: Parameters<typeof Icon>[0]['name'];
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
    <Surface
      position="fixed"
      top={0}
      right={0}
      bottom={0}
      left={0}
      zIndex={70}
      background="backdrop"
      direction="row"
      align="start"
      justify="center"
      paddingTop="12vh"
      onClick={onClose}
    >
      <Surface
        background="bg1"
        bordered
        borderTone="strong"
        radius="md"
        shadow="2"
        overflowY="hidden"
        width="min(560px, 94vw)"
        direction="column"
        onClick={(e) => e.stopPropagation()}
      >
        <Surface bordered={{ bottom: true }} paddingX={14} paddingY={12} direction="row" align="center" gap={10}>
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelected(0); }}
            placeholder="Type a command or search tasks…"
            className="ds-bare-input"
          />
          <Kbd>esc</Kbd>
        </Surface>
        <Surface maxHeight={360} overflowY="auto" padding={6} direction="column" gap={2}>
          {matches.length === 0 && (
            <Surface paddingX={20} paddingY={24} direction="row" justify="center">
              <Text size="sm" tone="faint">No commands match &quot;{q}&quot;</Text>
            </Surface>
          )}
          {matches.map((c, idx) => (
            <Surface
              key={c.id}
              as="button"
              type="button"
              width="100%"
              direction="row"
              align="center"
              gap={10}
              paddingX={10}
              paddingY={8}
              radius="sm"
              cursor="pointer"
              textAlign="left"
              background={idx === selected ? 'bg3' : 'transparent'}
              onMouseEnter={() => setSelected(idx)}
              onClick={() => { c.run(); onClose(); }}
            >
              <Surface width={20} direction="row" align="center" justify="center">
                <Icon name={c.icon ?? 'arrowRight'} size={14} />
              </Surface>
              <Stack direction="row" align="center" grow>
                <Text size="md">{c.label}</Text>
              </Stack>
              {c.hint && <Text size="xs" tone="faint">{c.hint}</Text>}
              {c.kbd && <Kbd>{c.kbd}</Kbd>}
            </Surface>
          ))}
        </Surface>
      </Surface>
    </Surface>
  );
}
