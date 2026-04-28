import React from 'react';
import { Container, Stack } from '@nightcoder/design-system';

/**
 * One row in the file tree. Encapsulates the depth-driven indentation, drag
 * affordance, and the rounded corners that bleed onto the row's hover state.
 *
 * Lives at the app layer (not under `libs/design-system`) because the radius +
 * hover-bg styling is FileTree-specific. The design-system primitives stay
 * generic; this component absorbs the file-tree-row escape in one place so
 * each row site doesn't repeat the className itself.
 */
export type TreeRowProps = {
  depth: number;
  cursor: 'pointer' | 'grab';
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
  title?: string;
  'data-testid'?: string;
  children: React.ReactNode;
};

export function TreeRow({
  depth,
  cursor,
  draggable,
  onDragStart,
  onClick,
  title,
  'data-testid': testId,
  children,
}: TreeRowProps) {
  return (
    <Container
      as="li"
      padding={['25', '100', '25', '100']}
      style={{ paddingLeft: 8 + depth * 12 }}
      cursor={cursor}
      userSelect="none"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      title={title}
      data-testid={testId}
      className="rounded-[var(--radius-sm)]"
    >
      <Stack direction="row" align="center" gap="50">
        {children}
      </Stack>
    </Container>
  );
}
