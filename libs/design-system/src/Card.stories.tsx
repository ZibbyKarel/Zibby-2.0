import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardContent, CardActions } from './Card';

const meta = {
  title: 'Design System/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  width: 'min(720px, 92vw)',
};
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const Btn = (props: { children: string }) => (
  <button
    type="button"
    style={{
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid var(--border)',
      background: 'var(--bg-3)',
      color: 'var(--text-0)',
      fontSize: 12,
      cursor: 'pointer',
    }}
  >
    {props.children}
  </button>
);

/**
 * Every variant × padding × composition pattern, side-by-side.
 */
export const Overview: Story = {
  render: () => (
    <div>
      <div style={label}>Variants</div>
      <div style={grid}>
        <Card variant="outlined">Outlined</Card>
        <Card variant="elevated">Elevated</Card>
        <Card variant="filled">Filled</Card>
      </div>
      <div style={{ ...label, marginTop: 24 }}>Padding</div>
      <div style={grid}>
        <Card padding="none">no padding</Card>
        <Card padding="sm">sm padding</Card>
        <Card padding="md">md padding</Card>
        <Card padding="lg">lg padding</Card>
      </div>
      <div style={{ ...label, marginTop: 24 }}>Interactive (hover)</div>
      <div style={grid}>
        <Card interactive>Hover me</Card>
      </div>
      <div style={{ ...label, marginTop: 24 }}>Composed</div>
      <div style={grid}>
        <Card>
          <CardHeader title="Refactor pipeline" subtitle="3 stories · branched off main" action={<Btn>Open</Btn>} />
          <CardContent>
            <p style={{ margin: '8px 0 0' }}>
              Plan the dependency DAG and stage each story behind a feature flag.
            </p>
          </CardContent>
          <CardActions>
            <Btn>Cancel</Btn>
            <Btn>Run</Btn>
          </CardActions>
        </Card>
      </div>
      <div style={{ ...label, marginTop: 24 }}>Custom className</div>
      <div style={grid}>
        <Card className="border-[var(--emerald)]/40">accent border</Card>
      </div>
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    variant: 'outlined',
    padding: 'md',
    interactive: false,
    as: 'div',
    className: '',
    children: 'Card content',
  },
  argTypes: {
    variant: { control: 'select', options: ['outlined', 'elevated', 'filled'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    interactive: { control: 'boolean' },
    as: { control: 'select', options: ['div', 'article', 'section', 'li'] },
    className: { control: 'text' },
    children: { control: 'text' },
    onClick: { action: 'click' },
  },
  render: (args) => (
    <div style={{ width: 'min(420px, 80vw)' }}>
      <Card {...args} />
    </div>
  ),
};
