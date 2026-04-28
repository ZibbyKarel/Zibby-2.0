import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion, AccordionSummary, AccordionDetails } from './Accordion';

const meta = {
  title: 'Design System/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const column: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, width: 400 };
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

/**
 * Every variant, icon position, and state side-by-side. Visual-regression baseline.
 */
export const Overview: Story = {
  args: {},
  render: () => (
    <div style={column}>
      <div>
        <div style={label}>Variants</div>
        <div style={column}>
          <Accordion defaultExpanded variant="outlined">
            <AccordionSummary>Outlined (expanded)</AccordionSummary>
            <AccordionDetails>Outlined accordion content with default md padding.</AccordionDetails>
          </Accordion>

          <Accordion variant="outlined">
            <AccordionSummary>Outlined (collapsed)</AccordionSummary>
            <AccordionDetails>Content only visible when expanded.</AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded variant="elevated">
            <AccordionSummary>Elevated</AccordionSummary>
            <AccordionDetails>Elevated variant applies the shadow-lg token.</AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded variant="filled">
            <AccordionSummary>Filled</AccordionSummary>
            <AccordionDetails>Filled variant uses a bg2 background with no border.</AccordionDetails>
          </Accordion>
        </div>
      </div>

      <div>
        <div style={label}>Expand icon position</div>
        <div style={column}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIconPosition="end">Icon at end (default)</AccordionSummary>
            <AccordionDetails>Chevron appears on the right.</AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded>
            <AccordionSummary expandIconPosition="start">Icon at start</AccordionSummary>
            <AccordionDetails>Chevron appears on the left.</AccordionDetails>
          </Accordion>
        </div>
      </div>

      <div>
        <div style={label}>Padding tokens</div>
        <div style={column}>
          {(['0', '150', '200', '300'] as const).map((p) => (
            <Accordion key={p} defaultExpanded>
              <AccordionSummary>padding=&quot;{p}&quot;</AccordionSummary>
              <AccordionDetails padding={p}>
                Details padding token: {p}
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      </div>

      <div>
        <div style={label}>Disabled</div>
        <Accordion defaultExpanded disabled>
          <AccordionSummary>Disabled (cannot collapse)</AccordionSummary>
          <AccordionDetails>The summary button is disabled — click does nothing.</AccordionDetails>
        </Accordion>
      </div>

      <div>
        <div style={label}>Custom className</div>
        <Accordion defaultExpanded className="ring-1 ring-[var(--emerald)]">
          <AccordionSummary>With custom className</AccordionSummary>
          <AccordionDetails>Any class can be applied to the Accordion root.</AccordionDetails>
        </Accordion>
      </div>
    </div>
  ),
};

/**
 * Every configurable prop exposed through Storybook controls.
 */
export const Playground: Story = {
  args: {
    defaultExpanded: true,
    disabled: false,
    variant: 'outlined',
    children: undefined,
  },
  argTypes: {
    variant:         { control: 'select', options: ['outlined', 'elevated', 'filled'] },
    disabled:        { control: 'boolean' },
    defaultExpanded: { control: 'boolean' },
    expanded:        { control: 'boolean' },
    onChange:        { action: 'onChange' },
    background:      { control: 'select', options: ['bg0', 'bg1', 'bg2', 'bg3', 'transparent'] },
    bordered:        { control: 'boolean' },
    borderTone:      { control: 'select', options: ['default', 'strong', 'accent', 'emerald', 'rose', 'amber'] },
    borderStyle:     { control: 'select', options: ['solid', 'dashed', 'dotted'] },
    radius:          { control: 'select', options: ['none', 'sm', 'md', 'pill'] },
    shadow:          { control: 'select', options: ['none', '1', '2'] },
  },
  render: (args) => (
    <div style={{ width: 400 }}>
      <Accordion {...args}>
        <AccordionSummary>Playground summary</AccordionSummary>
        <AccordionDetails>
          Control every prop from the panel on the right.
        </AccordionDetails>
      </Accordion>
    </div>
  ),
};

export const StartIcon: Story = {
  args: {},
  render: () => (
    <div style={{ width: 400 }}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIconPosition="start">File path / section title</AccordionSummary>
        <AccordionDetails padding="0">
          <div style={{ padding: '12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
            Diff or code content here
          </div>
        </AccordionDetails>
      </Accordion>
    </div>
  ),
};

function ControlledExample() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: '4px 10px', cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-raised)', color: 'var(--text-primary)' }}
      >
        Toggle externally ({open ? 'open' : 'closed'})
      </button>
      <Accordion expanded={open} onChange={setOpen}>
        <AccordionSummary>Controlled accordion</AccordionSummary>
        <AccordionDetails>This panel is driven by external state.</AccordionDetails>
      </Accordion>
    </div>
  );
}

export const Controlled: Story = {
  args: {},
  render: () => <ControlledExample />,
};
