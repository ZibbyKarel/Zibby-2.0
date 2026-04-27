export type DrawerTab = 'logs' | 'diff' | 'details';

export type SaveData = {
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
};

export type HunkLine =
  | { kind: 'header'; text: string }
  | { kind: 'add'; text: string; newLine: number }
  | { kind: 'del'; text: string; oldLine: number }
  | { kind: 'context'; text: string; oldLine: number; newLine: number }
  | { kind: 'other'; text: string };

export type HunkRowBackground = 'emeraldTint' | 'roseTint' | 'bg2' | 'transparent';
