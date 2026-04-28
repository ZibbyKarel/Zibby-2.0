import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Icon, IconName } from '../Icon';
import { useTokens } from '../../DesignSystemContext';
import {
  computeVisualStyle,
  type SurfaceBackground,
  type SurfaceBorderEdges,
  type SurfaceBorderStyle,
  type SurfaceBorderTone,
  type SurfaceRadius,
  type SurfaceShadow,
} from '../../visualStyles';
import { resolvePadding, spacingToPx, type Padding } from '../../tokens';

// ─── Context ─────────────────────────────────────────────────────────────────

type AccordionContextValue = {
  expanded: boolean;
  toggle: () => void;
  disabled: boolean;
  summaryId: string;
  detailsId: string;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext(): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('AccordionSummary / AccordionDetails must be rendered inside <Accordion>');
  return ctx;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccordionVariant = 'outlined' | 'elevated' | 'filled';
export type AccordionExpandIconPosition = 'start' | 'end';

export type AccordionProps = {
  /** Controlled expanded state. Pair with `onChange`. */
  expanded?: boolean;
  /** Initial expanded state when uncontrolled. Defaults to `false`. */
  defaultExpanded?: boolean;
  /** Called when the user toggles the accordion. */
  onChange?: (expanded: boolean) => void;
  disabled?: boolean;
  variant?: AccordionVariant;
  background?: SurfaceBackground;
  bordered?: boolean | SurfaceBorderEdges;
  borderTone?: SurfaceBorderTone;
  borderStyle?: SurfaceBorderStyle;
  radius?: SurfaceRadius;
  shadow?: SurfaceShadow;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  'data-testid'?: string;
};

export type AccordionSummaryProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'type'
> & {
  children?: ReactNode;
  /** Position of the expand/collapse chevron. Defaults to `'end'`. */
  expandIconPosition?: AccordionExpandIconPosition;
  'data-testid'?: string;
};

export type AccordionDetailsProps = HTMLAttributes<HTMLDivElement> & {
  /** Internal spacing — preset (`none`/`sm`/`md`/`lg`) or a Padding tuple. */
  padding?: Padding;
  children?: ReactNode;
  'data-testid'?: string;
};

// ─── Variant defaults ─────────────────────────────────────────────────────────

type VisualDefaults = { background: SurfaceBackground; bordered: boolean; shadow: SurfaceShadow };

const VARIANT_DEFAULTS: Record<AccordionVariant, VisualDefaults> = {
  outlined: { background: 'bg1', bordered: true,  shadow: 'none' },
  elevated: { background: 'bg1', bordered: true,  shadow: '2'    },
  filled:   { background: 'bg2', bordered: false, shadow: 'none' },
};

// ─── Summary styling ──────────────────────────────────────────────────────────

const SUMMARY_BASE =
  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left ' +
  'text-[var(--text-primary)] bg-[var(--bg-elevated)] border-none ' +
  'transition-colors hover:bg-[var(--bg-hover)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

// ─── Accordion ────────────────────────────────────────────────────────────────

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    expanded: expandedProp,
    defaultExpanded = false,
    onChange,
    disabled = false,
    variant = 'outlined',
    background,
    bordered,
    borderTone = 'default',
    borderStyle = 'solid',
    radius = 'md',
    shadow,
    className = '',
    style,
    children,
    'data-testid': dataTestId,
  },
  ref,
) {
  const [expandedState, setExpandedState] = useState(defaultExpanded);
  const isControlled = expandedProp !== undefined;
  const expanded = isControlled ? expandedProp : expandedState;

  const tokens = useTokens();
  const uid = useId();
  const summaryId = `accordion-summary-${uid}`;
  const detailsId = `accordion-details-${uid}`;

  const defaults = VARIANT_DEFAULTS[variant];
  const visualStyle = computeVisualStyle(
    {
      background: background ?? defaults.background,
      bordered: bordered ?? defaults.bordered,
      borderTone,
      borderStyle,
      radius,
      shadow: shadow ?? defaults.shadow,
    },
    tokens,
  );

  const toggle = () => {
    if (disabled) return;
    const next = !expanded;
    if (!isControlled) setExpandedState(next);
    onChange?.(next);
  };

  return (
    <AccordionContext.Provider value={{ expanded, toggle, disabled, summaryId, detailsId }}>
      <div
        ref={ref}
        className={['ds-accordion', className].filter(Boolean).join(' ')}
        style={{ overflow: 'hidden', ...visualStyle, ...style }}
        data-testid={dataTestId}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
});

// ─── AccordionSummary ─────────────────────────────────────────────────────────

export const AccordionSummary = forwardRef<HTMLButtonElement, AccordionSummaryProps>(
  function AccordionSummary(
    {
      children,
      expandIconPosition = 'end',
      className = '',
      style,
      'data-testid': dataTestId,
      ...rest
    },
    ref,
  ) {
    const { expanded, toggle, disabled, summaryId, detailsId } = useAccordionContext();

    const icon = (
      <Icon
        value={expanded ? IconName.ChevronDown : IconName.ChevronRight}
        size="xs"
        style={{ flexShrink: 0 }}
      />
    );

    const cls = [
      'ds-accordion-summary',
      SUMMARY_BASE,
      expanded ? 'border-b border-[var(--border)]' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        id={summaryId}
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        disabled={disabled}
        className={cls}
        style={style}
        onClick={toggle}
        data-testid={dataTestId}
        {...rest}
      >
        {expandIconPosition === 'start' && icon}
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {children}
        </span>
        {expandIconPosition === 'end' && icon}
      </button>
    );
  },
);

// ─── AccordionDetails ─────────────────────────────────────────────────────────

export const AccordionDetails = forwardRef<HTMLDivElement, AccordionDetailsProps>(
  function AccordionDetails(
    {
      children,
      padding = '200',
      className = '',
      style,
      'data-testid': dataTestId,
      ...rest
    },
    ref,
  ) {
    const { expanded, summaryId, detailsId } = useAccordionContext();

    if (!expanded) return null;

    const [pt, pr, pb, pl] = resolvePadding(padding);
    const paddingStyle = pt === '0' && pr === '0' && pb === '0' && pl === '0'
      ? {}
      : {
          paddingTop:    spacingToPx(pt),
          paddingRight:  spacingToPx(pr),
          paddingBottom: spacingToPx(pb),
          paddingLeft:   spacingToPx(pl),
        };

    return (
      <div
        ref={ref}
        id={detailsId}
        role="region"
        aria-labelledby={summaryId}
        className={['ds-accordion-details', className].filter(Boolean).join(' ')}
        style={{ ...paddingStyle, ...style }}
        data-testid={dataTestId}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
