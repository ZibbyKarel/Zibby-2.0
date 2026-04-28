// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion, AccordionSummary, AccordionDetails } from './Accordion';
import { defaultDarkTokens } from '../../tokens';

function rgb(hex: string): string {
  const span = document.createElement('span');
  span.style.color = hex;
  return span.style.color;
}

function renderAccordion({
  defaultExpanded = false,
  expanded,
  onChange,
  disabled,
  summaryTestId = 'summary',
  detailsTestId = 'details',
  expandIconPosition,
}: {
  defaultExpanded?: boolean;
  expanded?: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  summaryTestId?: string;
  detailsTestId?: string;
  expandIconPosition?: 'start' | 'end';
} = {}) {
  return render(
    <Accordion
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      onChange={onChange}
      disabled={disabled}
      data-testid="accordion"
    >
      <AccordionSummary
        data-testid={summaryTestId}
        expandIconPosition={expandIconPosition}
      >
        Section header
      </AccordionSummary>
      <AccordionDetails data-testid={detailsTestId}>
        Section content
      </AccordionDetails>
    </Accordion>,
  );
}

describe('Accordion', () => {
  describe('rendering', () => {
    it('renders with ds-accordion class', () => {
      render(
        <Accordion data-testid="a">
          <AccordionSummary>Header</AccordionSummary>
          <AccordionDetails>Body</AccordionDetails>
        </Accordion>,
      );
      expect(screen.getByTestId('a').className).toContain('ds-accordion');
    });

    it('always renders the summary', () => {
      renderAccordion();
      expect(screen.getByTestId('summary')).toBeInTheDocument();
    });

    it('does not render details when collapsed', () => {
      renderAccordion({ defaultExpanded: false });
      expect(screen.queryByTestId('details')).not.toBeInTheDocument();
    });

    it('renders details when defaultExpanded=true', () => {
      renderAccordion({ defaultExpanded: true });
      expect(screen.getByTestId('details')).toBeInTheDocument();
      expect(screen.getByText('Section content')).toBeInTheDocument();
    });

    it('merges a consumer className', () => {
      render(
        <Accordion data-testid="a" className="my-class">
          <AccordionSummary>H</AccordionSummary>
        </Accordion>,
      );
      expect(screen.getByTestId('a').className).toContain('my-class');
    });
  });

  describe('uncontrolled toggle', () => {
    it('expands when the summary is clicked', async () => {
      const user = userEvent.setup();
      renderAccordion();
      expect(screen.queryByTestId('details')).not.toBeInTheDocument();
      await user.click(screen.getByTestId('summary'));
      expect(screen.getByTestId('details')).toBeInTheDocument();
    });

    it('collapses when clicked again', async () => {
      const user = userEvent.setup();
      renderAccordion({ defaultExpanded: true });
      await user.click(screen.getByTestId('summary'));
      expect(screen.queryByTestId('details')).not.toBeInTheDocument();
    });
  });

  describe('controlled mode', () => {
    it('renders as expanded when expanded=true', () => {
      renderAccordion({ expanded: true });
      expect(screen.getByTestId('details')).toBeInTheDocument();
    });

    it('renders as collapsed when expanded=false', () => {
      renderAccordion({ expanded: false });
      expect(screen.queryByTestId('details')).not.toBeInTheDocument();
    });

    it('calls onChange with the toggled value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderAccordion({ expanded: false, onChange });
      await user.click(screen.getByTestId('summary'));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('does not change expanded state on its own in controlled mode', async () => {
      const user = userEvent.setup();
      renderAccordion({ expanded: false, onChange: vi.fn() });
      await user.click(screen.getByTestId('summary'));
      expect(screen.queryByTestId('details')).not.toBeInTheDocument();
    });
  });

  describe('disabled', () => {
    it('disables the summary button', () => {
      renderAccordion({ disabled: true });
      expect(screen.getByTestId('summary')).toBeDisabled();
    });

    it('does not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderAccordion({ disabled: true, onChange });
      await user.click(screen.getByTestId('summary'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('summary has aria-expanded=false when collapsed', () => {
      renderAccordion();
      expect(screen.getByTestId('summary')).toHaveAttribute('aria-expanded', 'false');
    });

    it('summary has aria-expanded=true when expanded', async () => {
      const user = userEvent.setup();
      renderAccordion();
      await user.click(screen.getByTestId('summary'));
      expect(screen.getByTestId('summary')).toHaveAttribute('aria-expanded', 'true');
    });

    it('summary aria-controls matches details id', async () => {
      const user = userEvent.setup();
      renderAccordion();
      await user.click(screen.getByTestId('summary'));
      const controlsId = screen.getByTestId('summary').getAttribute('aria-controls');
      const detailsId = screen.getByTestId('details').id;
      expect(controlsId).toBe(detailsId);
    });

    it('details has role=region and aria-labelledby pointing to summary', async () => {
      const user = userEvent.setup();
      renderAccordion();
      await user.click(screen.getByTestId('summary'));
      const details = screen.getByTestId('details');
      expect(details).toHaveAttribute('role', 'region');
      const labelledBy = details.getAttribute('aria-labelledby');
      const summaryId = screen.getByTestId('summary').id;
      expect(labelledBy).toBe(summaryId);
    });
  });

  describe('expandIconPosition', () => {
    it('renders chevron after children by default (end)', async () => {
      const user = userEvent.setup();
      renderAccordion({ expandIconPosition: 'end' });
      const btn = screen.getByTestId('summary');
      // Icon is last child, children-span is first
      expect(btn.lastElementChild?.tagName.toLowerCase()).not.toBe('span');
    });

    it('renders chevron before children when position=start', () => {
      renderAccordion({ expandIconPosition: 'start' });
      const btn = screen.getByTestId('summary');
      // First child is the icon (an svg), second is the span wrapping children
      expect(btn.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    });
  });

  describe('visual style', () => {
    it('outlined variant applies bg1 background and border', () => {
      render(
        <Accordion variant="outlined" data-testid="a">
          <AccordionSummary>H</AccordionSummary>
        </Accordion>,
      );
      const el = screen.getByTestId('a');
      expect(el.style.background).toBe(rgb(defaultDarkTokens.color.bg.surface));
      expect(el.style.borderTopWidth).toBe('1px');
    });

    it('elevated variant applies shadow', () => {
      render(
        <Accordion variant="elevated" data-testid="a">
          <AccordionSummary>H</AccordionSummary>
        </Accordion>,
      );
      expect(screen.getByTestId('a').style.boxShadow).toBe(defaultDarkTokens.size.shadowLg);
    });

    it('filled variant applies bg2 background with no border', () => {
      render(
        <Accordion variant="filled" data-testid="a">
          <AccordionSummary>H</AccordionSummary>
        </Accordion>,
      );
      const el = screen.getByTestId('a');
      expect(el.style.background).toBe(rgb(defaultDarkTokens.color.bg.elevated));
      expect(el.style.borderTopWidth).toBe('');
    });

    it('always has overflow: hidden', () => {
      render(
        <Accordion data-testid="a">
          <AccordionSummary>H</AccordionSummary>
        </Accordion>,
      );
      expect(screen.getByTestId('a').style.overflow).toBe('hidden');
    });
  });

  describe('AccordionDetails padding', () => {
    it('applies 16px padding for token=200 (default)', async () => {
      const user = userEvent.setup();
      renderAccordion({ defaultExpanded: true, detailsTestId: 'det' });
      expect(screen.getByTestId('det').style.padding).toBe('16px');
    });

    it('applies no padding for token=0', () => {
      render(
        <Accordion defaultExpanded data-testid="a">
          <AccordionSummary>H</AccordionSummary>
          <AccordionDetails padding="0" data-testid="det">x</AccordionDetails>
        </Accordion>,
      );
      expect(screen.getByTestId('det').style.padding).toBe('');
    });

    it('applies 12px padding for token=150', () => {
      render(
        <Accordion defaultExpanded data-testid="a">
          <AccordionSummary>H</AccordionSummary>
          <AccordionDetails padding="150" data-testid="det">x</AccordionDetails>
        </Accordion>,
      );
      expect(screen.getByTestId('det').style.padding).toBe('12px');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to Accordion root div', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Accordion ref={ref} data-testid="a">
          <AccordionSummary>H</AccordionSummary>
        </Accordion>,
      );
      expect(ref.current).toBe(screen.getByTestId('a'));
    });

    it('forwards ref to AccordionSummary button', () => {
      const ref = createRef<HTMLButtonElement>();
      render(
        <Accordion>
          <AccordionSummary ref={ref} data-testid="s">H</AccordionSummary>
        </Accordion>,
      );
      expect(ref.current).toBe(screen.getByTestId('s'));
    });

    it('forwards ref to AccordionDetails div', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Accordion defaultExpanded>
          <AccordionSummary>H</AccordionSummary>
          <AccordionDetails ref={ref} data-testid="d">Content</AccordionDetails>
        </Accordion>,
      );
      expect(ref.current).toBe(screen.getByTestId('d'));
    });
  });

  describe('context guard', () => {
    it('throws if AccordionSummary is used outside Accordion', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<AccordionSummary>H</AccordionSummary>)).toThrow(
        'AccordionSummary / AccordionDetails must be rendered inside <Accordion>',
      );
      consoleError.mockRestore();
    });
  });
});
