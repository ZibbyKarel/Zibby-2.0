import { forwardRef, type SVGAttributes } from 'react';
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
} from 'lucide-react';

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

export type IconProps = Omit<SVGAttributes<SVGSVGElement>, 'children'> & {
  /** The icon to render. Pass the `IconName.X` constant. */
  value: IconName;
  /** Diameter in pixels. Defaults to 16. */
  size?: number;
  /** Stroke width — pass-through to lucide. Defaults to 1.75. */
  strokeWidth?: number;
};

/**
 * Renders a curated lucide-react icon by name. Use `IconName.X` constants for
 * the `value` prop instead of bare strings.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { value, size = 16, strokeWidth = 1.75, ...props },
  ref,
) {
  const Glyph = registry[value];
  return <Glyph ref={ref} size={size} strokeWidth={strokeWidth} aria-hidden {...props} />;
});
