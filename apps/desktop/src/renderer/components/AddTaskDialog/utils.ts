import React from 'react';

export function mergeRefs<T>(...refs: Array<React.Ref<T> | null | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    }
  };
}

export type CaretInsertResult = { value: string; caretPos: number };

export function computeCaretInsert(
  currentValue: string,
  selStart: number,
  selEnd: number,
  text: string,
): CaretInsertResult {
  const before = currentValue.slice(0, selStart);
  const after = currentValue.slice(selEnd);
  const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
  const needsTrailingSpace = after.length > 0 && !/^\s/.test(after);
  const insertion = `${needsLeadingSpace ? ' ' : ''}${text}${needsTrailingSpace ? ' ' : ''}`;
  return { value: `${before}${insertion}${after}`, caretPos: before.length + insertion.length };
}
