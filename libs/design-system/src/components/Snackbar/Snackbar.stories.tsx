import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Snackbar } from './Snackbar';

const meta = {
  title: 'Design System/Snackbar',
  component: Snackbar,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Snackbar>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };

/**
 * Every supported severity, with and without title / message / close button.
 */
export const Overview: Story = {
  args: { open: true },
  render: () => (
    <div style={stack}>
      <Snackbar open severity="info"    title="Heads up"   message="Just so you know." />
      <Snackbar open severity="success" title="Saved"      message="Your changes were committed." />
      <Snackbar open severity="warning" title="Heads up"   message="This action cannot be undone." />
      <Snackbar open severity="error"   title="Failed"     message="The push could not complete." />
      <Snackbar open severity="info"    title="Title only" />
      <Snackbar open severity="info"    message="Message only — no title" />
      <Snackbar open severity="info"    title="With close" message="Click the X to dismiss." onClose={() => {}} />
    </div>
  ),
};

/**
 * Drives every prop. Toggle the controls panel to exercise the component.
 */
export const Playground: Story = {
  args: {
    open: true,
    severity: 'success',
    title: 'Pushed to origin',
    message: 'Branch nightcoder/foo opened a PR.',
    autoHideDuration: undefined,
    className: '',
  },
  argTypes: {
    open: { control: 'boolean' },
    severity: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    title: { control: 'text' },
    message: { control: 'text' },
    autoHideDuration: { control: 'number', description: 'ms before auto-dismiss; leave empty to keep it open' },
    className: { control: 'text' },
    onClose: { action: 'close' },
  },
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 10px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg-3)',
            color: 'var(--text-0)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Show
        </button>
        <Snackbar
          {...args}
          open={open}
          onClose={() => {
            args.onClose?.();
            setOpen(false);
          }}
        />
      </div>
    );
  },
};
