import { IconName } from '@nightcoder/design-system';
import type { AddTaskFormValues, PhaseKey } from './types';

export const PHASES: readonly { key: PhaseKey; label: string; icon: IconName }[] = [
  { key: 'planning', label: 'Plan', icon: IconName.ScrollText },
  { key: 'implementation', label: 'Code', icon: IconName.Zap },
  { key: 'qa', label: 'QA', icon: IconName.Check },
];

export const FORM_DEFAULTS: AddTaskFormValues = {
  title: '',
  description: '',
  acceptance: '',
  requiresHumanReview: true,
  phaseModels: {},
  blockerTaskIds: [],
  attachedFilePaths: [],
};
