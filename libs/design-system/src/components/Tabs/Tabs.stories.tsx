import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabPanel, type TabItem } from './Tabs';

const meta = {
  title: 'Design System/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24, width: 'min(620px, 90vw)' };
const label: CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 };

const baseTabs: readonly TabItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'logs',     label: 'Logs', badge: 12 },
  { key: 'pr',       label: 'PR', badge: 3 },
  { key: 'errors',   label: 'Errors', disabled: true },
];

function Demo({ variant, size }: { variant: 'underline' | 'pills'; size: 'sm' | 'md' }) {
  const [k, setK] = useState('overview');
  return (
    <div>
      <Tabs tabs={baseTabs} activeKey={k} onChange={setK} variant={variant} size={size} aria-label={`${variant} ${size}`} />
      <div style={{ paddingTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
        <TabPanel tabKey="overview" active={k === 'overview'}>Overview content</TabPanel>
        <TabPanel tabKey="logs" active={k === 'logs'}>Logs content</TabPanel>
        <TabPanel tabKey="pr" active={k === 'pr'}>PR content</TabPanel>
      </div>
    </div>
  );
}

/**
 * Variants × sizes, plus badges, disabled tab, and full-width.
 */
export const Overview: Story = {
  args: { tabs: baseTabs, activeKey: 'overview', onChange: () => {} },
  render: () => (
    <div style={stack}>
      <div>
        <div style={label}>Underline · md</div>
        <Demo variant="underline" size="md" />
      </div>
      <div>
        <div style={label}>Underline · sm</div>
        <Demo variant="underline" size="sm" />
      </div>
      <div>
        <div style={label}>Pills · md</div>
        <Demo variant="pills" size="md" />
      </div>
      <div>
        <div style={label}>Pills · sm</div>
        <Demo variant="pills" size="sm" />
      </div>
      <div>
        <div style={label}>Full width</div>
        <Tabs
          tabs={[
            { key: 'a', label: 'One' },
            { key: 'b', label: 'Two' },
            { key: 'c', label: 'Three' },
          ]}
          activeKey="a"
          onChange={() => {}}
          fullWidth
        />
      </div>
      <div>
        <div style={label}>Custom className</div>
        <Tabs
          tabs={baseTabs}
          activeKey="overview"
          onChange={() => {}}
          className="border-[var(--violet)]/30"
        />
      </div>
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    tabs: baseTabs,
    activeKey: 'overview',
    onChange: () => {},
    variant: 'underline',
    size: 'md',
    fullWidth: false,
    className: '',
    'aria-label': 'tabs',
  },
  argTypes: {
    activeKey: { control: 'select', options: baseTabs.map((t) => t.key) },
    variant: { control: 'select', options: ['underline', 'pills'] },
    size: { control: 'select', options: ['sm', 'md'] },
    fullWidth: { control: 'boolean' },
    className: { control: 'text' },
    'aria-label': { control: 'text' },
    onChange: { action: 'change' },
  },
  render: (args) => {
    const [k, setK] = useState(args.activeKey);
    return (
      <div style={{ width: 'min(620px, 90vw)' }}>
        <Tabs
          {...args}
          activeKey={k}
          onChange={(next) => {
            args.onChange?.(next);
            setK(next);
          }}
        />
      </div>
    );
  },
};
