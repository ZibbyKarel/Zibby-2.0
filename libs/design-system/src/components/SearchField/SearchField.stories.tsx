import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchField } from './SearchField';
import { Icon, IconName } from '../Icon';
import { Kbd } from '../Kbd';

const meta = {
  title: 'Design System/SearchField',
  component: SearchField,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

const col: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 360 };
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
    <div style={col}>
      <div>
        <div style={label}>Empty</div>
        <SearchField />
      </div>
      <div>
        <div style={label}>With leading icon</div>
        <SearchField startAdornment={<Icon value={IconName.Search} size="sm" />} />
      </div>
      <div>
        <div style={label}>With shortcut hint</div>
        <SearchField
          startAdornment={<Icon value={IconName.Search} size="sm" />}
          endAdornment={<Kbd>⌘K</Kbd>}
          placeholder="Search tasks"
        />
      </div>
      <div>
        <div style={label}>Filled</div>
        <SearchField
          defaultValue="refactor"
          startAdornment={<Icon value={IconName.Search} size="sm" />}
        />
      </div>
      <div>
        <div style={label}>Disabled</div>
        <SearchField disabled startAdornment={<Icon value={IconName.Search} size="sm" />} />
      </div>
      <div>
        <div style={label}>Custom width via wrapperClassName</div>
        <SearchField wrapperClassName="w-full" startAdornment={<Icon value={IconName.Search} size="sm" />} />
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    placeholder: 'Search tasks',
    minWidth: 260,
    disabled: false,
    startAdornment: <Icon value={IconName.Search} size="sm" />,
    endAdornment: <Kbd>⌘K</Kbd>,
  },
  argTypes: {
    onChange: { action: 'change' },
    onFocus: { action: 'focus' },
    onBlur: { action: 'blur' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    minWidth: { control: 'text' },
    type: {
      control: 'select',
      options: ['search', 'text'],
    },
  },
};
