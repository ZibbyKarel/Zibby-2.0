import React, { useEffect, useState } from 'react';
import type { Usage } from '@nightcoder/shared-types/ipc';
import { UsageRing, fmtCountdown } from './primitives';

type ViewUsage = {
  usedPct: number;
  resetsAt: number;
};

function toViewUsage(w: { usedPercentage: number; resetsAt: number } | null): ViewUsage | null {
  if (!w) return null;
  return { usedPct: Math.round(w.usedPercentage), resetsAt: w.resetsAt };
}

type Props = { tick: number };

export function UsagePanel({ tick: _tick }: Props) {
  const [fiveHour, setFiveHour] = useState<ViewUsage | null>(null);
  const [weekly, setWeekly] = useState<ViewUsage | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.nightcoder.getUsage().then((u) => {
      if (cancelled) return;
      applyUsage(u);
    }).catch(() => {});
    const unsub = window.nightcoder.onUsageUpdate((u) => { if (!cancelled) applyUsage(u); });
    return () => { cancelled = true; unsub(); };
  }, []);

  function applyUsage(u: Usage | null) {
    setFiveHour(toViewUsage(u?.fiveHour ?? null));
    setWeekly(toViewUsage(u?.sevenDay ?? null));
  }

  if (!fiveHour && !weekly) return null;

  const now = Date.now();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '8px 12px', background: 'var(--bg-1)',
      border: '1px solid var(--border)', borderRadius: 10,
    }}>
      {fiveHour && (
        <UsageMini label="5H" pct={fiveHour.usedPct} resetsInMs={Math.max(0, fiveHour.resetsAt - now)} />
      )}
      {fiveHour && weekly && (
        <div style={{ width: 1, height: 30, background: 'var(--border)' }} />
      )}
      {weekly && (
        <UsageMini label="WEEK" pct={weekly.usedPct} resetsInMs={Math.max(0, weekly.resetsAt - now)} />
      )}
    </div>
  );
}

function UsageMini({ label, pct, resetsInMs }: { label: string; pct: number; resetsInMs: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <UsageRing pct={pct} size={34} stroke={3} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 9, letterSpacing: '.14em', fontWeight: 600, color: 'var(--text-3)' }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-1)' }}>
          -{fmtCountdown(resetsInMs)}
        </span>
      </div>
    </div>
  );
}
