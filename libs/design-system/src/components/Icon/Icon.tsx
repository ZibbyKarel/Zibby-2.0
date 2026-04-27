import { forwardRef, type SVGAttributes } from 'react';
import type { Size } from '../../tokens';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle,
  Check as CheckGlyph,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronLeft,
  Clock,
  Command,
  Copy,
  File as FileGlyph,
  Filter,
  Folder,
  GitBranch,
  GitCompare,
  Info,
  Link,
  Menu,
  MoreHorizontal,
  Moon,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  X as XGlyph,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

// lucide-react v1 doesn't ship a GitHub brand mark, so we hand-roll one
// that matches the lucide stroke conventions (24x24 viewBox, currentColor).
const Github: LucideIcon = forwardRef<SVGSVGElement, LucideProps>(function Github(
  { size = 24, strokeWidth = 2, color = 'currentColor', absoluteStrokeWidth, ...rest },
  ref,
) {
  const stroke = absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}) as LucideIcon;

/**
 * Curated set of icons available through the design-system `Icon` component.
 *
 * Use `IconName.SomeName` rather than the raw string literal so the type system
 * catches typos and renames. The underlying glyphs come from `lucide-react`.
 */
export const IconName = {
  AlertCircle:  'alertCircle',
  AlertTriangle:'alertTriangle',
  ArrowRight:   'arrowRight',
  Bell:         'bell',
  Check:        'check',
  CheckCircle:  'checkCircle',
  ChevronDown:  'chevronDown',
  ChevronLeft:  'chevronLeft',
  ChevronRight: 'chevronRight',
  ChevronUp:    'chevronUp',
  Clock:        'clock',
  Command:      'command',
  Copy:         'copy',
  Edit:         'edit',
  File:         'file',
  Filter:       'filter',
  Folder:       'folder',
  Git:          'git',
  Github:       'github',
  Diff:         'diff',
  Info:         'info',
  Link:         'link',
  Menu:         'menu',
  Moon:         'moon',
  More:         'more',
  Paperclip:    'paperclip',
  Pause:        'pause',
  Play:         'play',
  Plus:         'plus',
  Refresh:      'refresh',
  Search:       'search',
  Sparkle:      'sparkle',
  Sun:          'sun',
  Terminal:     'terminal',
  Trash:        'trash',
  Warn:         'warn',
  X:            'x',
  Zap:          'zap',
} as const;

export type IconName = typeof IconName[keyof typeof IconName];

const registry: Record<IconName, LucideIcon> = {
  [IconName.AlertCircle]:   AlertCircle,
  [IconName.AlertTriangle]: AlertTriangle,
  [IconName.ArrowRight]:    ArrowRight,
  [IconName.Bell]:          Bell,
  [IconName.Check]:         CheckGlyph,
  [IconName.CheckCircle]:   CheckCircle,
  [IconName.ChevronDown]:   ChevronDown,
  [IconName.ChevronLeft]:   ChevronLeft,
  [IconName.ChevronRight]:  ChevronRight,
  [IconName.ChevronUp]:     ChevronUp,
  [IconName.Clock]:         Clock,
  [IconName.Command]:       Command,
  [IconName.Copy]:          Copy,
  [IconName.Edit]:          Pencil,
  [IconName.File]:          FileGlyph,
  [IconName.Filter]:        Filter,
  [IconName.Folder]:        Folder,
  [IconName.Git]:           GitBranch,
  [IconName.Github]:        Github,
  [IconName.Diff]:          GitCompare,
  [IconName.Info]:          Info,
  [IconName.Link]:          Link,
  [IconName.Menu]:          Menu,
  [IconName.Moon]:          Moon,
  [IconName.More]:          MoreHorizontal,
  [IconName.Paperclip]:     Paperclip,
  [IconName.Pause]:         Pause,
  [IconName.Play]:          Play,
  [IconName.Plus]:          Plus,
  [IconName.Refresh]:       RefreshCw,
  [IconName.Search]:        Search,
  [IconName.Sparkle]:       Sparkles,
  [IconName.Sun]:           Sun,
  [IconName.Terminal]:      Terminal,
  [IconName.Trash]:         Trash2,
  [IconName.Warn]:          AlertTriangle,
  [IconName.X]:             XGlyph,
  [IconName.Zap]:           Zap,
};

/** Pixel diameter rendered for each {@link Size} token. */
const sizePx: Record<Size, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

export type IconProps = Omit<SVGAttributes<SVGSVGElement>, 'children'> & {
  /** The icon to render. Pass the `IconName.X` constant. */
  value: IconName;
  /** T-shirt size token. Defaults to `'md'` (16px). */
  size?: Size;
  /** Stroke width — pass-through to lucide. Defaults to 1.75. */
  strokeWidth?: number;
};

/**
 * Renders a curated lucide-react icon by name. Use `IconName.X` constants for
 * the `value` prop instead of bare strings.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { value, size = 'md', strokeWidth = 1.75, ...props },
  ref,
) {
  const Glyph = registry[value];
  return (
    <Glyph
      ref={ref}
      size={sizePx[size]}
      strokeWidth={strokeWidth}
      aria-hidden
      {...props}
    />
  );
});
