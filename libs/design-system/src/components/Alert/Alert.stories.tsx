import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

const meta = {
  title: 'Design System/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  width: 'min(520px, 86vw)',
};

/**
 * Every supported severity, with and without title / dismissable button.
 */
export const Overview: Story = {
  render: () => (
    <div style={stack}>
      <Alert severity="info"    title="Info"    >Just so you know.</Alert>
      <Alert severity="success" title="Success" >Branch pushed and PR opened.</Alert>
      <Alert severity="warning" title="Warning" >This action is not reversible.</Alert>
      <Alert severity="error"   title="Error"   >git push failed: authentication required.</Alert>
      <Alert severity="info">Body-only — no title.</Alert>
      <Alert severity="success" title="Saved" />
      <Alert severity="error" title="Dismissable" onClose={() => {}}>
        Click the X on the right to dismiss.
      </Alert>
      <Alert severity="info" title="Custom className" className="font-mono">
        Renders the body in monospace.
      </Alert>
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    severity: 'error',
    title: 'Push failed',
    children: 'git push exited with status 128 — gh auth login may be needed.',
    className: '',
  },
  argTypes: {
    severity: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    title: { control: 'text' },
    children: { control: 'text' },
    className: { control: 'text' },
    onClose: { action: 'close' },
  },
  render: (args) => (
    <div style={{ width: 'min(520px, 86vw)' }}>
      <Alert {...args} />
    </div>
  ),
};
