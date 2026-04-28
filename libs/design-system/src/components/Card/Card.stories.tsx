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
 * Every variant × visual-treatment × ergonomic-prop combination, side-by-side.
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

      <div style={{ ...label, marginTop: 24 }}>Padding (preset and tuple)</div>
      <div style={grid}>
        <Card padding="none">no padding</Card>
        <Card padding="sm">sm padding</Card>
        <Card padding="md">md padding</Card>
        <Card padding="lg">lg padding</Card>
        <Card padding={['100', '100']}>tuple ['100','100'] (8px)</Card>
        <Card padding={['75', '350']}>tuple ['75','350'] (6px/28px)</Card>
        <Card padding={['50', '150', '250', '150']}>tuple ['50','150','250','150']</Card>
      </div>

      <div style={{ ...label, marginTop: 24 }}>Backgrounds</div>
      <div style={grid}>
        <Card background="bg0">bg0</Card>
        <Card background="bg2">bg2</Card>
        <Card background="bg3">bg3</Card>
        <Card background="hover">hover</Card>
        <Card background="emeraldTint">emeraldTint</Card>
        <Card background="roseTint">roseTint</Card>
        <Card background="amberTint">amberTint</Card>
        <Card background="skyTint">skyTint</Card>
        <Card background="violetTint">violetTint</Card>
        <Card background="accentSoft">accentSoft</Card>
      </div>

      <div style={{ ...label, marginTop: 24 }}>Borders (per edge, tones, styles)</div>
      <div style={grid}>
        <Card bordered={{ top: true }}>top only</Card>
        <Card bordered={{ bottom: true }}>bottom only</Card>
        <Card bordered={{ left: true }}>left only</Card>
        <Card bordered={{ right: true }}>right only</Card>
        <Card bordered borderTone="strong">strong</Card>
        <Card bordered borderTone="accent">accent</Card>
        <Card bordered borderTone="rose">rose</Card>
        <Card bordered borderStyle="dashed">dashed</Card>
        <Card bordered borderStyle="dotted">dotted</Card>
      </div>

      <div style={{ ...label, marginTop: 24 }}>Radius + shadow</div>
      <div style={grid}>
        <Card radius="none">radius none</Card>
        <Card radius="sm">radius sm</Card>
        <Card radius="md">radius md</Card>
        <Card radius="pill" padding="sm">radius pill</Card>
        <Card shadow="1">shadow 1</Card>
        <Card shadow="2">shadow 2</Card>
      </div>

      <div style={{ ...label, marginTop: 24 }}>Container-shaped props (sizing / overflow)</div>
      <div style={grid}>
        <Card minWidth={240} minHeight={80}>min 240×80</Card>
        <Card maxWidth={240}>max width 240</Card>
        <Card height={80} overflowY="auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>scrolls line {i + 1}</div>
          ))}
        </Card>
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
        <Card className="border-[var(--emerald)]/40">accent border (className escape)</Card>
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
    radius: 'md',
    interactive: false,
    as: 'div',
    className: '',
    children: 'Card content',
  },
  argTypes: {
    variant:     { control: 'select', options: ['outlined', 'elevated', 'filled'] },
    padding:     { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    background:  { control: 'select', options: ['bg0', 'bg1', 'bg2', 'bg3', 'hover', 'emerald', 'rose', 'amber', 'sky', 'violet', 'emeraldTint', 'roseTint', 'amberTint', 'skyTint', 'violetTint', 'accentSoft', 'backdrop', 'transparent'] },
    bordered:    { control: 'boolean' },
    borderTone:  { control: 'select', options: ['default', 'strong', 'accent', 'emerald', 'rose', 'amber', 'sky', 'violet'] },
    borderStyle: { control: 'select', options: ['solid', 'dashed', 'dotted'] },
    radius:      { control: 'select', options: ['none', 'sm', 'md', 'pill'] },
    shadow:      { control: 'select', options: ['none', '1', '2'] },
    interactive: { control: 'boolean' },
    minWidth:    { control: 'text' },
    maxWidth:    { control: 'text' },
    minHeight:   { control: 'text' },
    overflowY:   { control: 'select', options: ['visible', 'auto', 'hidden', 'scroll'] },
    as:          { control: 'select', options: ['div', 'article', 'section', 'li', 'aside', 'main', 'header', 'footer'] },
    className:   { control: 'text' },
    children:    { control: 'text' },
    onClick:     { action: 'click' },
  },
  render: (args) => (
    <div style={{ width: 'min(420px, 80vw)' }}>
      <Card {...args} />
    </div>
  ),
};
