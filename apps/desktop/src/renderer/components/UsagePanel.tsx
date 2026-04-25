import React, { useEffect, useState } from 'react';
import type { Usage } from '@nightcoder/shared-types/ipc';
import { CircularProgress, Divider, Stack, Surface, Text } from '@nightcoder/design-system';
import { fmtCountdown } from './primitives';

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
    <Surface
      background="bg1"
      bordered
      radius="md"
      paddingX={12}
      paddingY={8}
      direction="row"
      align="center"
      gap={14}
    >
      {fiveHour && (
        <UsageMini label="5H" pct={fiveHour.usedPct} resetsInMs={Math.max(0, fiveHour.resetsAt - now)} />
      )}
      {fiveHour && weekly && <Divider orientation="vertical" />}
      {weekly && (
        <UsageMini label="WEEK" pct={weekly.usedPct} resetsInMs={Math.max(0, weekly.resetsAt - now)} />
      )}
    </Surface>
  );
}

function UsageMini({ label, pct, resetsInMs }: { label: string; pct: number; resetsInMs: number }) {
  return (
    <Stack direction="row" align="center" gap={8}>
      <CircularProgress value={pct} size={34} thickness={3} />
      <Stack direction="column" gap={1}>
        <Text size="xxs" weight="semibold" tone="faint" tracking="wider">{label}</Text>
        <Text size="xxs" mono tone="muted">-{fmtCountdown(resetsInMs)}</Text>
      </Stack>
    </Stack>
  );
}
