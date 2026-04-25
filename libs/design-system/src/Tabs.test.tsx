// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabPanel, type TabItem } from './Tabs';

const tabs: readonly TabItem[] = [
  { key: 'a', label: 'Apple' },
  { key: 'b', label: 'Banana', badge: 3 },
  { key: 'c', label: 'Cherry', disabled: true },
];

describe('Tabs', () => {
  it('renders one button per tab with role=tab', () => {
    render(<Tabs tabs={tabs} activeKey="a" onChange={() => {}} />);
    const tabButtons = screen.getAllByRole('tab');
    expect(tabButtons).toHaveLength(3);
  });

  it('marks the active tab with aria-selected=true', () => {
    render(<Tabs tabs={tabs} activeKey="b" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Banana/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders the badge', () => {
    render(<Tabs tabs={tabs} activeKey="a" onChange={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('disables disabled tabs', () => {
    render(<Tabs tabs={tabs} activeKey="a" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Cherry' })).toBeDisabled();
  });

  it('calls onChange when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeKey="a" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Banana/ }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('does NOT call onChange for disabled tabs', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeKey="a" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Cherry' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(['underline', 'pills'] as const)('applies the %s variant', (variant) => {
    render(<Tabs tabs={tabs} activeKey="a" onChange={() => {}} variant={variant} />);
    const tablist = screen.getByRole('tablist');
    if (variant === 'underline') expect(tablist.className).toContain('border-b');
    if (variant === 'pills')     expect(tablist.className).toContain('rounded-[var(--radius-sm)]');
  });

  it.each([
    ['sm', 'h-8'],
    ['md', 'h-10'],
  ] as const)('applies the %s size', (size, expected) => {
    render(<Tabs tabs={tabs} activeKey="a" onChange={() => {}} size={size} />);
    expect(screen.getByRole('tab', { name: 'Apple' }).className).toContain(expected);
  });

  it('switches tabs when clicked (controlled wrapper)', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [k, setK] = useState<'a' | 'b'>('a');
      return (
        <>
          <Tabs<'a' | 'b'>
            tabs={[
              { key: 'a', label: 'A' },
              { key: 'b', label: 'B' },
            ]}
            activeKey={k}
            onChange={setK}
          />
          <TabPanel tabKey="a" active={k === 'a'}>panel-a</TabPanel>
          <TabPanel tabKey="b" active={k === 'b'}>panel-b</TabPanel>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByText('panel-a')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'B' }));
    expect(screen.getByText('panel-b')).toBeInTheDocument();
    expect(screen.queryByText('panel-a')).toBeNull();
  });

  it('TabPanel renders children only when active', () => {
    const { rerender } = render(<TabPanel tabKey="x" active={false}>x</TabPanel>);
    expect(screen.queryByText('x')).toBeNull();
    rerender(<TabPanel tabKey="x" active>x</TabPanel>);
    expect(screen.getByText('x')).toBeInTheDocument();
  });

  it('merges a consumer className onto the tablist', () => {
    render(<Tabs tabs={tabs} activeKey="a" onChange={() => {}} className="extra-class" />);
    expect(screen.getByRole('tablist').className).toContain('extra-class');
  });
});
