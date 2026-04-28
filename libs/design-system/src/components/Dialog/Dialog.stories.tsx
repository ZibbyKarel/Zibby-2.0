import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog } from './Dialog';

const meta = {
  title: 'Design System/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Dialog>;

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

const cancelBtn: CSSProperties = {
  padding: '6px 10px',
  border: '1px solid transparent',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 12,
};

const okBtn: CSSProperties = {
  padding: '6px 10px',
  border: '1px solid var(--emerald)',
  borderRadius: 6,
  background: 'var(--emerald)',
  color: '#04140d',
  cursor: 'pointer',
  fontSize: 12,
};

function DemoContainer({ render }: { render: (open: boolean, set: (v: boolean) => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 24 }}>
      <button type="button" style={trigger} onClick={() => setOpen(true)}>
        Open
      </button>
      {render(open, setOpen)}
    </div>
  );
}

/**
 * Every visual state for `Dialog` — basic, with description, with actions, scrollable, custom width.
 */
export const Overview: Story = {
  args: { open: true },
  render: () => (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Dialog open title="Basic" description="A small confirmation dialog." actions={
        <>
          <button type="button" style={cancelBtn}>Cancel</button>
          <button type="button" style={okBtn}>Confirm</button>
        </>
      }>
        Are you sure you want to discard this draft?
      </Dialog>
    </div>
  ),
  parameters: { layout: 'fullscreen' },
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    open: false,
    title: 'Discard changes?',
    description: 'This action cannot be undone.',
    width: 'min(560px, 92vw)',
    closeOnBackdropClick: true,
    closeOnEsc: true,
    className: '',
    children: 'Are you sure you want to throw away the current draft?',
  },
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
    width: { control: 'text' },
    closeOnBackdropClick: { control: 'boolean' },
    closeOnEsc: { control: 'boolean' },
    className: { control: 'text' },
    children: { control: 'text' },
    onClose: { action: 'close' },
  },
  render: (args) => (
    <DemoContainer
      render={(open, set) => (
        <Dialog
          {...args}
          open={args.open || open}
          onClose={() => {
            args.onClose?.();
            set(false);
          }}
          actions={
            <>
              <button type="button" style={cancelBtn} onClick={() => set(false)}>Cancel</button>
              <button type="button" style={okBtn} onClick={() => set(false)}>Confirm</button>
            </>
          }
        />
      )}
    />
  ),
};
