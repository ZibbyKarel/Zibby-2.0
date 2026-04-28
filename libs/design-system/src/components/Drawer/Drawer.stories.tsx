import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Drawer, type DrawerAnchor } from './Drawer';

const meta = {
  title: 'Design System/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<typeof meta>;

const trigger: CSSProperties = {
  padding: '6px 10px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 12,
};

function Demo({ anchor, label }: { anchor: DrawerAnchor; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" style={trigger} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} anchor={anchor} title={`${label} drawer`}>
        <div style={{ padding: 16 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
            Drawer content for the {anchor} anchor.
          </p>
        </div>
      </Drawer>
    </>
  );
}

/**
 * Every supported anchor, plus modal toggle and a no-title variant.
 */
export const Overview: Story = {
  args: { open: false },
  render: () => (
    <div style={{ padding: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Demo anchor="left"   label="Open left" />
      <Demo anchor="right"  label="Open right" />
      <Demo anchor="top"    label="Open top" />
      <Demo anchor="bottom" label="Open bottom" />
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    open: false,
    anchor: 'right',
    width: 480,
    height: 320,
    title: 'Settings',
    modal: true,
    closeOnEsc: true,
    closeOnBackdropClick: true,
    className: '',
  },
  argTypes: {
    open: { control: 'boolean' },
    anchor: { control: 'select', options: ['left', 'right', 'top', 'bottom'] },
    width: { control: 'text' },
    height: { control: 'text' },
    title: { control: 'text' },
    modal: { control: 'boolean' },
    closeOnEsc: { control: 'boolean' },
    closeOnBackdropClick: { control: 'boolean' },
    className: { control: 'text' },
    onClose: { action: 'close' },
  },
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return (
      <div style={{ padding: 24 }}>
        <button type="button" style={trigger} onClick={() => setOpen(true)}>
          Open
        </button>
        <Drawer
          {...args}
          open={open || args.open}
          onClose={() => {
            args.onClose?.();
            setOpen(false);
          }}
        >
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
            Drawer body
          </div>
        </Drawer>
      </div>
    );
  },
};
