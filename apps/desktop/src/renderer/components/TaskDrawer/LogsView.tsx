import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Container, Icon, IconButton, IconName, Stack, Text, type TextTone } from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import type { TaskVM } from '../../viewModel';

export function LogsView({ task }: { task: TaskVM }) {
  const containerRef = useRef<HTMLElement>(null);
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
      <Container
        padding={['500', '250']}
        data-testid={TestIds.Drawer.logsEmpty}
      >
        <Stack direction="column" align="center" gap="100">
          <Icon value={IconName.Terminal} size="xl" />
          <Text size="sm" tone="faint">No logs yet. Run this task to stream output.</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Card
      ref={containerRef}
      variant="filled"
      background="bg0"
      bordered={false}
      radius="none"
      padding="0"
      height="100%"
      overflowY="auto"
      position="relative"
      onScroll={handleScroll}
    >
      <Container as="pre" padding={['150', '200']}>
        <Stack direction="column" gap="0">
          {task.logs.map((l, i) => {
            const tone: TextTone = l.s === 'err' ? 'rose' : l.s === 'info' ? 'sky' : 'muted';
            const prefix = l.s === 'err' ? '✗ ' : '';
            return (
              <Stack key={i} direction="row" gap="100" data-testid={TestIds.Drawer.logLine(i + 1)}>
                <Container minWidth={28} userSelect="none">
                  <Text size="sm" mono tone="faint" align="end">
                    {String(i + 1).padStart(3, ' ')}
                  </Text>
                </Container>
                <Container grow>
                  <Text size="sm" mono tone={tone} whitespace="pre-wrap">
                    {prefix}{l.l}
                  </Text>
                </Container>
              </Stack>
            );
          })}
          {task.status === 'running' && <span className="ds-caret" />}
        </Stack>
      </Container>
      {!autoScroll && (
        <Container
          position="sticky"
          bottom={16}
          padding={['0', '200', '0', '0']}
          pointerEvents="none"
        >
          <Stack direction="row" justify="end">
            <Card
              variant="filled"
              background="bg2"
              radius="pill"
              shadow="2"
              padding="0"
              pointerEvents="auto"
            >
              <IconButton
                aria-label="Scroll to bottom"
                title="Scroll to bottom"
                variant="secondary"
                icon={IconName.ChevronDown}
                onClick={scrollToBottom}
              />
            </Card>
          </Stack>
        </Container>
      )}
    </Card>
  );
}
