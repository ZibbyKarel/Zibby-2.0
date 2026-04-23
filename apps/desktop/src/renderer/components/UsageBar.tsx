import { useEffect, useState } from 'react';
import type { Usage, UsageWindow } from '@zibby/shared-types/ipc';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; usage: Usage | null };

export function UsageBar() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = await window.zibby.getUsage();
      if (!cancelled) setState({ kind: 'ready', usage: initial });
    })();
    const unsub = window.zibby.onUsageUpdate((usage) => {
      setState({ kind: 'ready', usage });
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return (
    <div
      className="flex flex-col gap-1 min-w-[10rem] max-w-[14rem]"
      aria-label="Claude Code usage"
    >
      <UsageRow label="5h" window={pickWindow(state, 'fiveHour')} pending={state.kind === 'loading'} />
      <UsageRow label="Week" window={pickWindow(state, 'sevenDay')} pending={state.kind === 'loading'} />
    </div>
  );
}

function pickWindow(state: State, key: 'fiveHour' | 'sevenDay'): UsageWindow | null {
  if (state.kind !== 'ready' || !state.usage) return null;
  return state.usage[key];
}

function UsageRow({
  label,
  window: w,
  pending,
}: {
  label: string;
  window: UsageWindow | null;
  pending: boolean;
}) {
  const pct = w ? Math.round(w.usedPercentage) : null;
  const barColor =
    pct === null ? 'bg-neutral-700' : pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500';
  const resetTitle = w ? `Resets ${formatResetsAt(w.resetsAt)}` : undefined;
  return (
    <div className="flex flex-col gap-0.5" title={resetTitle}>
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-neutral-400">
        <span>{label}</span>
        <span className="font-mono text-neutral-300">
          {pending ? '…' : pct === null ? '—' : `${pct}%`}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-neutral-800 overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
      >
        <div
          className={`h-full ${barColor} transition-[width] duration-300`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function formatResetsAt(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
