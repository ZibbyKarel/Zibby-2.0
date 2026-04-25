import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Surface } from './Surface';
import { Stack } from './Stack';

const meta = {
  title: 'Design System/Surface',
  component: Surface,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Surface>;

export default meta;

type Story = StoryObj<typeof meta>;

const wrap: CSSProperties = { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, width: 720 };
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

export const Overview: Story = {
  args: {},
  render: () => (
    <div style={wrap}>
      <div>
        <div style={label}>Backgrounds</div>
        <Stack direction="row" gap={8}>
          {(['bg0', 'bg1', 'bg2', 'bg3', 'hover', 'transparent'] as const).map((bg) => (
            <Surface key={bg} background={bg} bordered radius="sm" padding={12}>
              {bg}
            </Surface>
          ))}
        </Stack>
      </div>

      <div>
        <div style={label}>Borders (per edge)</div>
        <Stack direction="row" gap={8}>
          <Surface bordered={{ top: true }} padding={12}>top</Surface>
          <Surface bordered={{ bottom: true }} padding={12}>bottom</Surface>
          <Surface bordered={{ left: true }} padding={12}>left</Surface>
          <Surface bordered={{ right: true }} padding={12}>right</Surface>
          <Surface bordered padding={12}>all</Surface>
          <Surface bordered borderTone="strong" padding={12}>strong</Surface>
          <Surface bordered borderTone="rose" padding={12}>rose</Surface>
        </Stack>
      </div>

      <div>
        <div style={label}>Radius + shadow</div>
        <Stack direction="row" gap={12} align="center">
          <Surface background="bg2" bordered padding={12} radius="none">none</Surface>
          <Surface background="bg2" bordered padding={12} radius="sm">sm</Surface>
          <Surface background="bg2" bordered padding={12} radius="md">md</Surface>
          <Surface background="bg2" bordered padding={12} radius="pill">pill</Surface>
          <Surface background="bg2" bordered padding={12} radius="md" shadow="1">shadow 1</Surface>
          <Surface background="bg2" bordered padding={12} radius="md" shadow="2">shadow 2</Surface>
        </Stack>
      </div>

      <div>
        <div style={label}>Padding scales</div>
        <Stack direction="row" gap={8}>
          <Surface bordered padding={4}>p=4</Surface>
          <Surface bordered padding={12}>p=12</Surface>
          <Surface bordered paddingX={20} paddingY={6}>x=20 y=6</Surface>
        </Stack>
      </div>

      <div>
        <div style={label}>Composition (page chrome)</div>
        <Surface as="header" background="bg1" bordered={{ bottom: true }} paddingX={20} paddingY={14}>
          <Stack direction="row" align="center" gap={12}>
            <span style={{ fontWeight: 600 }}>Header slot</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>actions →</span>
          </Stack>
        </Surface>
      </div>

      <div>
        <div style={label}>Custom element via `as`</div>
        <Stack direction="row" gap={8}>
          <Surface as="section" bordered padding={12}>section</Surface>
          <Surface as="aside" bordered padding={12}>aside</Surface>
          <Surface as="footer" bordered padding={12}>footer</Surface>
          <Surface as="article" bordered padding={12}>article</Surface>
        </Stack>
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    background: 'bg1',
    bordered: true,
    borderTone: 'default',
    radius: 'md',
    shadow: 'none',
    padding: 16,
    children: 'Playground content',
  },
  argTypes: {
    background: { control: 'select', options: ['bg0', 'bg1', 'bg2', 'bg3', 'hover', 'transparent'] },
    borderTone: { control: 'select', options: ['default', 'strong', 'accent', 'rose', 'amber', 'sky', 'violet'] },
    bordered:   { control: 'boolean' },
    radius:     { control: 'select', options: ['none', 'sm', 'md', 'pill'] },
    shadow:     { control: 'select', options: ['none', '1', '2'] },
    padding:    { control: 'number' },
    paddingX:   { control: 'number' },
    paddingY:   { control: 'number' },
    as:         { control: 'select', options: ['div', 'header', 'section', 'aside', 'footer', 'article', 'main'] },
    children:   { control: 'text' },
  },
};
