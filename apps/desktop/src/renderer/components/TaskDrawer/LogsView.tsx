import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, IconButton, IconName, Stack, Surface, Text, type TextTone } from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import type { TaskVM } from '../../viewModel';

export function LogsView({ task }: { task: TaskVM }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [task.logs.length, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    setAutoScroll(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
  }, []);

  if (task.logs.length === 0) {
    return (
      <Surface
        paddingX={20}
        paddingY={40}
        direction="column"
        align="center"
        gap={8}
        data-testid={TestIds.Drawer.logsEmpty}
      >
        <Icon value={IconName.Terminal} size="xl" />
        <Text size="sm" tone="faint">No logs yet. Run this task to stream output.</Text>
      </Surface>
    );
  }

  return (
    <Surface
      ref={containerRef as React.Ref<HTMLElement>}
      onScroll={handleScroll}
      height="100%"
      overflowY="auto"
      position="relative"
      background="bg0"
    >
      <Surface as="pre" paddingX={18} paddingY={14} direction="column" gap={0}>
        {task.logs.map((l, i) => {
          const tone: TextTone = l.s === 'err' ? 'rose' : l.s === 'info' ? 'sky' : 'muted';
          const prefix = l.s === 'err' ? '✗ ' : '';
          return (
            <Stack key={i} direction="row" gap={8} data-testid={TestIds.Drawer.logLine(i + 1)}>
              <Surface minWidth={28} userSelect="none">
                <Text size="sm" mono tone="faint" align="end">
                  {String(i + 1).padStart(3, ' ')}
                </Text>
              </Surface>
              <Surface grow>
                <Text size="sm" mono tone={tone} whitespace="pre-wrap">
                  {prefix}{l.l}
                </Text>
              </Surface>
            </Stack>
          );
        })}
        {task.status === 'running' && <span className="ds-caret" />}
      </Surface>
      {!autoScroll && (
        <Surface
          position="sticky"
          bottom={16}
          direction="row"
          justify="end"
          paddingRight={16}
          pointerEvents="none"
        >
          <Surface pointerEvents="auto" radius="pill" shadow="2">
            <IconButton
              aria-label="Scroll to bottom"
              title="Scroll to bottom"
              variant="secondary"
              icon={IconName.ChevronDown}
              onClick={scrollToBottom}
            />
          </Surface>
        </Surface>
      )}
    </Surface>
  );
}
