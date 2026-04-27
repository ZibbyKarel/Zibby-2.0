import React from 'react';
import type { ThinkingLevel } from '@nightcoder/shared-types/ipc';
import { Icon, IconName, Select, Surface, Text } from '@nightcoder/design-system';

export const MODEL_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

const THINKING_LEVELS: readonly {
  value: ThinkingLevel;
  label: string;
  dots: number;
}[] = [
  { value: 'off', label: 'Off', dots: 0 },
  { value: 'low', label: 'Low', dots: 1 },
  { value: 'medium', label: 'Med', dots: 2 },
  { value: 'high', label: 'High', dots: 3 },
];

const PHASE_ICON_MAP: Record<string, IconName> = {
  sparkle: IconName.Sparkle,
  zap: IconName.Zap,
  check: IconName.Check,
};

type ModelPickProps = {
  label: string;
  icon: string;
  model: string;
  onModelChange: (model: string) => void;
  thinking: ThinkingLevel;
  onThinkingChange: (level: ThinkingLevel) => void;
  modelSelectTestId?: string;
  thinkingSelectTestId?: string;
};

export function ModelPick({
  label,
  icon,
  model,
  onModelChange,
  thinking,
  onThinkingChange,
  modelSelectTestId,
  thinkingSelectTestId,
}: ModelPickProps) {
  const iconValue = PHASE_ICON_MAP[icon] ?? IconName.Sparkle;
  const activeLevel =
    THINKING_LEVELS.find((l) => l.value === thinking) ?? THINKING_LEVELS[0];

  return (
    <Surface
      grow
      minWidth={0}
      bordered
      radius="sm"
      background="bg2"
      paddingX={10}
      paddingTop={8}
      paddingBottom={8}
      direction="column"
      gap={8}
    >
      <Surface direction="row" align="center" gap={6}>
        <Icon value={iconValue} size="xs" />
        <Text
          size="xs"
          weight="semibold"
          tone="faint"
          tracking="wide"
          style={{ textTransform: 'uppercase' }}
        >
          {label}
        </Text>
      </Surface>

      <Select
        aria-label={`${label} model`}
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        options={MODEL_OPTIONS}
        data-testid={modelSelectTestId}
      />

      <Surface direction="column" gap={4}>
        <Surface direction="row" align="center" justify="between">
          <Surface direction="row" align="center" gap={4}>
            <Icon value={IconName.Sparkle} size="xs" />
            <Text
              size="xs"
              tone="faint"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                fontSize: 9,
              }}
            >
              Thinking
            </Text>
          </Surface>
          <Text
            size="xs"
            mono
            style={{ color: thinkingLevelColor(activeLevel.value) }}
          >
            {activeLevel.label}
          </Text>
        </Surface>
        <Surface direction="row" gap={3}>
          {THINKING_LEVELS.map((lvl) => {
            const active = lvl.value === thinking;
            const color = thinkingLevelColor(lvl.value);
            return (
              <button
                key={lvl.value}
                onClick={() => onThinkingChange(lvl.value)}
                title={`Thinking: ${lvl.label}`}
                data-testid={
                  lvl.value === thinking ? thinkingSelectTestId : undefined
                }
                style={{
                  flex: 1,
                  height: 20,
                  padding: 0,
                  background: active ? 'var(--bg-1)' : 'transparent',
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  boxShadow: active ? `0 0 0 1px ${color}22 inset` : 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  transition: 'all .12s',
                }}
              >
                {lvl.dots === 0 ? (
                  <span
                    style={{
                      fontSize: 9,
                      color: active ? color : 'var(--text-3)',
                      fontWeight: 600,
                    }}
                  >
                    ∅
                  </span>
                ) : (
                  Array.from({ length: lvl.dots }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: 3,
                        background: active ? color : 'var(--text-3)',
                        opacity: active ? 1 : 0.5,
                      }}
                    />
                  ))
                )}
              </button>
            );
          })}
        </Surface>
      </Surface>
    </Surface>
  );
}

function thinkingLevelColor(level: ThinkingLevel): string {
  switch (level) {
    case 'low':
      return 'var(--sky)';
    case 'medium':
      return 'var(--amber)';
    case 'high':
      return 'var(--emerald)';
    default:
      return 'var(--text-3)';
  }
}
