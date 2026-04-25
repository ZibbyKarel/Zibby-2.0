import { useId, type ReactNode } from 'react';

export type TabItem<T extends string = string> = {
  key: T;
  label: ReactNode;
  /** Optional badge rendered after the label (e.g. counts). */
  badge?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
};

export type TabsProps<T extends string = string> = {
  tabs: readonly TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  /** Visual emphasis. `underline` is the default (matches the existing TaskDrawer look). */
  variant?: 'underline' | 'pills';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
} as const;

export function Tabs<T extends string>({
  tabs,
  activeKey,
  onChange,
  variant = 'underline',
  size = 'md',
  fullWidth,
  className = '',
  'aria-label': ariaLabel,
}: TabsProps<T>) {
  const baseId = useId();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center ${variant === 'underline' ? 'border-b border-[var(--border)]' : 'gap-1 p-1 rounded-[var(--radius-sm)] bg-[var(--bg-2)] border border-[var(--border)]'} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
    >
      {tabs.map((t) => {
        const active = t.key === activeKey;
        const tabId = `${baseId}-tab-${t.key}`;
        const panelId = `${baseId}-panel-${t.key}`;

        const underlineActive = active
          ? 'text-[var(--text-0)] border-b-2 border-[var(--emerald)]'
          : 'text-[var(--text-2)] border-b-2 border-transparent hover:text-[var(--text-0)]';

        const pillsActive = active
          ? 'bg-[var(--bg-1)] text-[var(--text-0)] shadow-[var(--shadow-1)]'
          : 'text-[var(--text-2)] hover:text-[var(--text-0)]';

        const variantClasses = variant === 'underline' ? underlineActive : `${pillsActive} rounded-[var(--radius-sm)]`;

        return (
          <button
            key={t.key}
            id={tabId}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={panelId}
            disabled={t.disabled}
            onClick={() => !t.disabled && onChange(t.key)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${sizes[size]} ${variantClasses} ${fullWidth ? 'flex-1 justify-center' : ''}`.trim()}
          >
            {t.icon && <span className="flex items-center">{t.icon}</span>}
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge !== null && (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--bg-3)] px-1 text-[10px] font-semibold text-[var(--text-1)]">
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type TabPanelProps = {
  /** Should match the active tab's key. */
  tabKey: string;
  active: boolean;
  children: ReactNode;
  className?: string;
};

export function TabPanel({ tabKey, active, children, className = '' }: TabPanelProps) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`panel-${tabKey}`} className={className}>
      {children}
    </div>
  );
}
