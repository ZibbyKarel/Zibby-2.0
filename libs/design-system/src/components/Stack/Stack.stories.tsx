import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from './Stack';

const meta = {
  title: 'Design System/Stack',
  component: Stack,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

const sectionLabel: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const tile = (n: number): CSSProperties => ({
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 12,
  color: 'var(--text-0)',
  minWidth: n,
});

/**
 * Every Stack configuration — directions, alignment, justification, wrap, gaps.
 */
export const Overview: Story = {
  render: () => (
    <Stack gap="250" style={{ width: 'min(620px, 90vw)' }}>
      <div>
        <div style={sectionLabel}>Direction (column, default)</div>
        <Stack gap="100">
          <div style={tile(60)}>1</div>
          <div style={tile(60)}>2</div>
          <div style={tile(60)}>3</div>
        </Stack>
      </div>
      <div>
        <div style={sectionLabel}>Direction (row)</div>
        <Stack direction="row" gap="100">
          <div style={tile(40)}>1</div>
          <div style={tile(40)}>2</div>
          <div style={tile(40)}>3</div>
        </Stack>
      </div>
      <div>
        <div style={sectionLabel}>align=center, justify=between, row</div>
        <Stack direction="row" align="center" justify="between" gap="100" style={{ height: 60, border: '1px dashed var(--border)', padding: 8 }}>
          <div style={tile(40)}>L</div>
          <div style={tile(40)}>M</div>
          <div style={tile(40)}>R</div>
        </Stack>
      </div>
      <div>
        <div style={sectionLabel}>wrap, gap 150 (12px)</div>
        <Stack direction="row" gap="150" wrap>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={tile(80)}>tile {i + 1}</div>
          ))}
        </Stack>
      </div>
      <div>
        <div style={sectionLabel}>grow / shrink (children inside a fixed-width row)</div>
        <Stack direction="row" gap="100" style={{ width: 360, border: '1px dashed var(--border)', padding: 8 }}>
          <Stack shrink={false} style={tile(80)}>fixed</Stack>
          <Stack grow style={tile(80)}>grows</Stack>
          <Stack shrink={false} style={tile(40)}>fixed</Stack>
        </Stack>
      </div>
      <div>
        <div style={sectionLabel}>inline-flex (renders inline with surrounding text)</div>
        <span>before&nbsp;</span>
        <Stack inline direction="row" gap="50">
          <div style={tile(20)}>a</div>
          <div style={tile(20)}>b</div>
        </Stack>
        <span>&nbsp;after</span>
      </div>
      <div>
        <div style={sectionLabel}>Custom className + as=ul</div>
        <Stack as="ul" gap="50" className="font-mono" style={{ paddingLeft: 16 }}>
          <li>Apple</li>
          <li>Banana</li>
          <li>Cherry</li>
        </Stack>
      </div>
    </Stack>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    direction: 'row',
    align: 'center',
    justify: 'start',
    gap: '150',
    wrap: false,
    inline: false,
    grow: false,
    className: '',
  },
  argTypes: {
    direction: { control: 'select', options: ['row', 'column', 'row-reverse', 'column-reverse'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch', 'baseline'] },
    justify: { control: 'select', options: ['start', 'center', 'end', 'between', 'around', 'evenly'] },
    gap: { control: 'select', options: ['0', '25', '50', '75', '100', '150', '200', '250', '300', '350', '400', '450', '500'] },
    wrap: { control: 'boolean' },
    inline: { control: 'boolean' },
    grow: { control: 'boolean' },
    shrink: { control: 'boolean' },
    className: { control: 'text' },
  },
  render: (args) => (
    <Stack {...args} style={{ border: '1px dashed var(--border)', padding: 12, minHeight: 80, width: 'min(560px, 90vw)' }}>
      <div style={tile(60)}>1</div>
      <div style={tile(60)}>2</div>
      <div style={tile(60)}>3</div>
    </Stack>
  ),
};
