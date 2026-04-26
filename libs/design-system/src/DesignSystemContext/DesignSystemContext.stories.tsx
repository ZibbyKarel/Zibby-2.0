import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DesignSystemProvider } from './DesignSystemContext';
import { Badge } from '../components/Badge';
import { Chip } from '../components/Chip';
import { Card, CardContent, CardHeader } from '../components/Card';

const meta = {
  title: 'Design System/DesignSystemProvider',
  component: DesignSystemProvider,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DesignSystemProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  width: 'min(620px, 90vw)',
};
const row: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const sectionLabel: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

/**
 * Default tokens vs. an override that swaps the running-status palette and the
 * chip accent tone. Components consume tokens via hooks, so they re-render
 * automatically when the provider value changes.
 */
export const Overview: Story = {
  args: { children: null },
  render: () => (
    <div style={stack}>
      <div>
        <div style={sectionLabel}>Default tokens</div>
        <Card>
          <CardHeader title="No override" subtitle="Built-in palette is used" />
          <CardContent>
            <div style={row}>
              <Badge status="running" />
              <Badge status="pushing" />
              <Badge status="done" />
              <Badge status="failed" />
            </div>
            <div style={{ ...row, marginTop: 8 }}>
              <Chip tone="accent">accent</Chip>
              <Chip tone="violet">violet</Chip>
              <Chip tone="warn">warn</Chip>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div style={sectionLabel}>Overridden tokens</div>
        <DesignSystemProvider
          tokens={{
            status: {
              running: {
                color: 'var(--violet)',
                bg: 'rgba(167,139,250,.15)',
                dot: 'var(--violet)',
              },
            },
            chip: {
              accent: {
                color: 'var(--sky)',
                bg: 'rgba(56,189,248,.10)',
                border: 'rgba(56,189,248,.25)',
              },
            },
          }}
        >
          <Card>
            <CardHeader
              title="With override"
              subtitle="running → violet, accent chip → sky"
            />
            <CardContent>
              <div style={row}>
                <Badge status="running" />
                <Badge status="pushing" />
                <Badge status="done" />
                <Badge status="failed" />
              </div>
              <div style={{ ...row, marginTop: 8 }}>
                <Chip tone="accent">accent</Chip>
                <Chip tone="violet">violet</Chip>
                <Chip tone="warn">warn</Chip>
              </div>
            </CardContent>
          </Card>
        </DesignSystemProvider>
      </div>
    </div>
  ),
};

/**
 * Drive the override from the controls panel. Pass JSON for `tokens`.
 */
export const Playground: Story = {
  args: { tokens: undefined, children: null },
  argTypes: {
    tokens: { control: 'object' },
  },
  render: (args) => (
    <DesignSystemProvider tokens={args.tokens}>
      <div style={row}>
        <Badge status="running" />
        <Badge status="pushing" />
        <Badge status="done" />
        <Chip tone="accent">accent</Chip>
        <Chip tone="violet">violet</Chip>
      </div>
    </DesignSystemProvider>
  ),
};
