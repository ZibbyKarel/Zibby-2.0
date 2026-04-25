import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircularProgress } from './CircularProgress';

const meta = {
  title: 'Design System/CircularProgress',
  component: CircularProgress,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof CircularProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' };
const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const label: CSSProperties = { fontSize: 11, color: 'var(--text-2)', letterSpacing: '.08em', textTransform: 'uppercase' };

/**
 * Every supported visual state side-by-side.
 */
export const Overview: Story = {
  render: () => (
    <div style={stack}>
      <div>
        <div style={label}>Determinate (color thresholds)</div>
        <div style={row}>
          {[0, 25, 50, 74, 80, 92, 100].map((v) => (
            <CircularProgress key={v} value={v} aria-label={`${v}%`} />
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Sizes</div>
        <div style={row}>
          <CircularProgress value={42} size={28} thickness={3} aria-label="28" />
          <CircularProgress value={42} size={44} aria-label="44" />
          <CircularProgress value={42} size={64} thickness={5} aria-label="64" />
          <CircularProgress value={42} size={96} thickness={6} aria-label="96" />
        </div>
      </div>
      <div>
        <div style={label}>With label</div>
        <div style={row}>
          <CircularProgress value={62} label="usage" />
          <CircularProgress value={88} label="quota" />
        </div>
      </div>
      <div>
        <div style={label}>Indeterminate (spinner)</div>
        <div style={row}>
          <CircularProgress aria-label="loading sm" size={20} thickness={2} />
          <CircularProgress aria-label="loading md" />
          <CircularProgress aria-label="loading lg" size={64} thickness={5} />
        </div>
      </div>
      <div>
        <div style={label}>Custom color</div>
        <div style={row}>
          <CircularProgress value={50} color="var(--violet)" aria-label="violet" />
          <CircularProgress value={50} color="var(--sky)" aria-label="sky" />
        </div>
      </div>
      <div>
        <div style={label}>Hidden value</div>
        <div style={row}>
          <CircularProgress value={50} showValue={false} aria-label="hidden" />
        </div>
      </div>
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    value: 42,
    size: 60,
    thickness: 5,
    label: 'usage',
    showValue: true,
    color: undefined,
    className: '',
    'aria-label': 'progress',
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    size: { control: { type: 'range', min: 16, max: 200, step: 2 } },
    thickness: { control: { type: 'range', min: 1, max: 12, step: 1 } },
    label: { control: 'text' },
    showValue: { control: 'boolean' },
    color: { control: 'text' },
    className: { control: 'text' },
    'aria-label': { control: 'text' },
  },
};
