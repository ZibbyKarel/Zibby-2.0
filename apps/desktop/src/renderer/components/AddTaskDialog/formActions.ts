import React from 'react';
import type { FormControls } from '@nightcoder/form';
import type { PhaseModel } from '@nightcoder/shared-types/ipc';
import { DRAG_MIME } from './FileTree/FileTree';
import type { AddTaskFormValues, PhaseKey } from './types';
import { computeCaretInsert } from './utils';

export function setPhase(
  methods: FormControls<AddTaskFormValues>,
  key: PhaseKey,
  patch: Partial<PhaseModel>,
): void {
  const prev = methods.getValues('phaseModels');
  const current = prev[key] ?? {};
  const next: PhaseModel = { ...current, ...patch };
  if (!next.model && (!next.thinking || next.thinking === 'off')) {
    const { [key]: _omit, ...rest } = prev;
    void _omit;
    methods.setValue('phaseModels', rest, { shouldDirty: true });
  } else {
    methods.setValue(
      'phaseModels',
      { ...prev, [key]: next },
      { shouldDirty: true },
    );
  }
}

export async function pickFiles(
  methods: FormControls<AddTaskFormValues>,
  setPickError: (err: string | null) => void,
): Promise<void> {
  setPickError(null);
  try {
    const result = await window.nightcoder.pickFilesToAttach();
    if (result.kind === 'cancelled') return;
    const prev = methods.getValues('attachedFilePaths');
    const seen = new Set(prev);
    const next = [...prev];
    for (const p of result.paths) {
      if (!seen.has(p)) {
        next.push(p);
        seen.add(p);
      }
    }
    methods.setValue('attachedFilePaths', next, { shouldDirty: true });
  } catch (err) {
    setPickError(err instanceof Error ? err.message : String(err));
  }
}

export function removeFile(
  methods: FormControls<AddTaskFormValues>,
  path: string,
): void {
  const prev = methods.getValues('attachedFilePaths');
  methods.setValue(
    'attachedFilePaths',
    prev.filter((p) => p !== path),
    {
      shouldDirty: true,
    },
  );
}

export function insertAtCaret(
  methods: FormControls<AddTaskFormValues>,
  descriptionRef: React.RefObject<HTMLTextAreaElement | null>,
  text: string,
): void {
  const ta = descriptionRef.current;
  const currentDesc = methods.getValues('description');
  const start = ta?.selectionStart ?? currentDesc.length;
  const end = ta?.selectionEnd ?? currentDesc.length;
  const { value: next, caretPos } = computeCaretInsert(
    currentDesc,
    start,
    end,
    text,
  );
  methods.setValue('description', next, { shouldDirty: true });
  if (ta) {
    requestAnimationFrame(() => {
      const el = descriptionRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretPos, caretPos);
    });
  }
}

export function handleDescriptionDrop(
  e: React.DragEvent<HTMLTextAreaElement>,
  methods: FormControls<AddTaskFormValues>,
  descriptionRef: React.RefObject<HTMLTextAreaElement | null>,
  setDropActive: (active: boolean) => void,
): void {
  const path =
    e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain');
  if (!path) return;
  e.preventDefault();
  setDropActive(false);
  insertAtCaret(methods, descriptionRef, `@${path}`);
}
