import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Container } from './Container';
import { Stack } from '../Stack';

const meta = {
  title: 'Design System/Container',
  component: Container,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Container>;

export default meta;

type Story = StoryObj<typeof meta>;

const wrap: CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  width: 720,
};

const sectionLabel: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const tile: CSSProperties = {
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--text-0)',
};

/**
 * Container groups every prop bucket side-by-side: padding, dimensions,
 * positioning, overflow, cursor/opacity, polymorphic `as`. Visual treatment
 * (background, border, radius, shadow) is deliberately Card's job — Container
 * never paints chrome.
 */
export const Overview: Story = {
  render: () => (
    <div style={wrap}>
      <div>
        <div style={sectionLabel}>Padding (token tuple)</div>
        <Stack direction="row" gap="100">
          <Container padding={['50', '50']} style={tile}>['50','50'] (4px)</Container>
          <Container padding={['150', '150']} style={tile}>['150','150'] (12px)</Container>
          <Container padding={['75', '250']} style={tile}>['75','250'] (6/20px)</Container>
          <Container padding={['250', '150', '50', '150']} style={tile}>['250','150','50','150']</Container>
        </Stack>
      </div>

      <div>
        <div style={sectionLabel}>Dimensions</div>
        <Stack direction="row" gap="100">
          <Container width={80} height={48} style={tile}>80x48</Container>
          <Container minWidth={120} style={tile}>min 120</Container>
          <Container maxWidth={140} style={tile}>max 140</Container>
        </Stack>
      </div>

      <div>
        <div style={sectionLabel}>Position (parent: relative; child: absolute)</div>
        <Container position="relative" width={300} height={80} style={{ ...tile, background: 'var(--bg-1)' }}>
          <Container position="absolute" top={8} right={8} padding={['75', '75']} style={{ ...tile, background: 'var(--bg-2)' }}>
            top-right
          </Container>
          <Container position="absolute" bottom={8} left={8} padding={['75', '75']} style={{ ...tile, background: 'var(--bg-2)' }}>
            bottom-left
          </Container>
        </Container>
      </div>

      <div>
        <div style={sectionLabel}>Overflow (scroll)</div>
        <Container width={240} height={60} overflowY="auto" padding={['100', '100']} style={{ ...tile, background: 'var(--bg-1)' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ padding: '4px 0' }}>scrollable line {i + 1}</div>
          ))}
        </Container>
      </div>

      <div>
        <div style={sectionLabel}>Cursor / opacity / pointer-events / userSelect / textAlign</div>
        <Stack direction="row" gap="100">
          <Container cursor="pointer" padding={['100', '100']} style={tile}>cursor=pointer</Container>
          <Container cursor="not-allowed" padding={['100', '100']} style={tile}>not-allowed</Container>
          <Container opacity={0.4} padding={['100', '100']} style={tile}>opacity=0.4</Container>
          <Container userSelect="none" padding={['100', '100']} style={tile}>userSelect=none</Container>
          <Container textAlign="center" width={120} padding={['100', '100']} style={tile}>centered</Container>
        </Stack>
      </div>

      <div>
        <div style={sectionLabel}>Polymorphism (`as` prop)</div>
        <Stack direction="row" gap="100">
          <Container as="section" padding={['100', '100']} style={tile}>section</Container>
          <Container as="aside" padding={['100', '100']} style={tile}>aside</Container>
          <Container as="footer" padding={['100', '100']} style={tile}>footer</Container>
          <Container as="article" padding={['100', '100']} style={tile}>article</Container>
          <Container as="ul" padding={['100', '100']} style={{ ...tile, listStyle: 'none' }}>
            <Container as="li" style={{ display: 'block' }}>list item</Container>
          </Container>
        </Stack>
      </div>

      <div>
        <div style={sectionLabel}>Flex-child hints (inside a parent flex row)</div>
        <Stack direction="row" gap="100" style={{ width: 360, padding: 8, border: '1px dashed var(--border)' }}>
          <Container shrink={false} width={80} padding={['100', '100']} style={tile}>fixed</Container>
          <Container grow padding={['100', '100']} style={tile}>grows to fill</Container>
          <Container shrink={false} width={40} padding={['100', '100']} style={tile}>fixed</Container>
        </Stack>
      </div>
    </div>
  ),
};

/**
 * Drives every Container prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    as: 'div',
    padding: ['200', '200'],
    width: 220,
    height: 80,
    cursor: 'auto',
    textAlign: 'left',
    overflow: 'visible',
    opacity: 1,
    grow: false,
    children: 'Playground content',
  },
  argTypes: {
    as: {
      control: 'select',
      options: ['div', 'span', 'section', 'article', 'main', 'header', 'footer', 'aside', 'nav', 'ul', 'ol', 'li', 'pre', 'figure', 'label'],
    },
    padding:       { control: 'object' },
    width:         { control: 'text' },
    height:        { control: 'text' },
    minWidth:      { control: 'text' },
    maxWidth:      { control: 'text' },
    minHeight:     { control: 'text' },
    maxHeight:     { control: 'text' },
    position:      { control: 'select', options: ['static', 'relative', 'absolute', 'fixed', 'sticky'] },
    top:           { control: 'text' },
    right:         { control: 'text' },
    bottom:        { control: 'text' },
    left:          { control: 'text' },
    zIndex:        { control: 'number' },
    overflow:      { control: 'select', options: ['visible', 'auto', 'hidden', 'scroll'] },
    overflowX:     { control: 'select', options: ['visible', 'auto', 'hidden', 'scroll'] },
    overflowY:     { control: 'select', options: ['visible', 'auto', 'hidden', 'scroll'] },
    cursor:        { control: 'select', options: ['auto', 'default', 'pointer', 'not-allowed', 'grab', 'grabbing', 'text'] },
    pointerEvents: { control: 'select', options: ['auto', 'none'] },
    userSelect:    { control: 'select', options: ['auto', 'none', 'text', 'all'] },
    textAlign:     { control: 'select', options: ['left', 'center', 'right'] },
    resize:        { control: 'select', options: ['none', 'vertical', 'horizontal', 'both'] },
    opacity:       { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    grow:          { control: 'boolean' },
    shrink:        { control: 'boolean' },
    className:     { control: 'text' },
    children:      { control: 'text' },
    onClick:       { action: 'click' },
  },
  render: (args) => (
    <div style={{ padding: 16 }}>
      <Container {...args} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }} />
    </div>
  ),
};
