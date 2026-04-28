import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './Divider';

const meta = {
  title: 'Design System/Divider',
  component: Divider,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Divider>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, width: 'min(420px, 80vw)' };
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' };
const label: CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '.08em', textTransform: 'uppercase' };

/**
 * Every divider variant — horizontal, vertical, with text, with spacing.
 */
export const Overview: Story = {
  render: () => (
    <div style={stack}>
      <div>
        <div style={label}>Horizontal</div>
        <Divider />
      </div>
      <div>
        <div style={label}>Horizontal with text</div>
        <Divider>OR</Divider>
      </div>
      <div>
        <div style={label}>Horizontal with spacing 16</div>
        <span>before</span>
        <Divider spacing={16} />
        <span>after</span>
      </div>
      <div>
        <div style={label}>Vertical (inline, default 1em height)</div>
        <div style={row}>
          <span>left</span>
          <Divider orientation="vertical" />
          <span>right</span>
        </div>
      </div>
      <div>
        <div style={label}>Vertical (flexItem, fills cross-axis)</div>
        <div style={{ ...row, height: 60, alignItems: 'stretch' }}>
          <span>left</span>
          <Divider orientation="vertical" flexItem />
          <span>right</span>
        </div>
      </div>
      <div>
        <div style={label}>Vertical with spacing</div>
        <div style={row}>
          <span>left</span>
          <Divider orientation="vertical" spacing={12} />
          <span>right</span>
        </div>
      </div>
      <div>
        <div style={label}>Custom className</div>
        <Divider className="bg-[var(--emerald)]/40" />
      </div>
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    orientation: 'horizontal',
    flexItem: false,
    children: '',
    spacing: undefined,
    className: '',
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    flexItem: { control: 'boolean' },
    children: { control: 'text', description: 'Inline label (only for horizontal)' },
    spacing: { control: 'number' },
    className: { control: 'text' },
  },
  render: (args) => (
    <div style={{ width: 'min(420px, 80vw)', display: 'flex', alignItems: 'center', gap: 12, height: 60 }}>
      {args.orientation === 'vertical' ? (
        <>
          <span>left</span>
          <Divider {...args} />
          <span>right</span>
        </>
      ) : (
        <div style={{ flex: 1 }}>
          <Divider {...args} />
        </div>
      )}
    </div>
  ),
};
