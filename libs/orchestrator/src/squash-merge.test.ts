import { describe, expect, it } from 'vitest';
import type { Story } from '@nightcoder/shared-types/ipc';
import { formatSquashCommitTitle } from './squash-merge';

const baseStory: Story = {
  taskId: 'add-widget',
  title: 'Add widget',
  description: 'desc',
  acceptanceCriteria: ['ac'],
  affectedFiles: [],
};

describe('formatSquashCommitTitle', () => {
  it('uses the numericId with a hash prefix when present', () => {
    expect(formatSquashCommitTitle({ ...baseStory, numericId: 3 })).toBe('[#3]: Add widget');
  });

  it('falls back to the taskId slug when numericId is missing', () => {
    expect(formatSquashCommitTitle(baseStory)).toBe('[add-widget]: Add widget');
  });
});
