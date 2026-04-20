import { useEffect, useRef } from 'react';
import { useSubtaskStream } from '../hooks/useSubtaskStream';

export function LogTail({ subtaskId }: { subtaskId: string }) {
  const events = useSubtaskStream(subtaskId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  const logLines = events.filter((e) => e.type === 'log' && e.line);

  return (
    <div className="bg-gray-900 text-gray-100 rounded text-xs font-mono p-3 max-h-64 overflow-y-auto">
      {logLines.length === 0 && <span className="text-gray-500">Waiting for output...</span>}
      {logLines.map((e, i) => {
        let text = e.line ?? '';
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          if (parsed['type'] === 'assistant') {
            const content = (parsed['message'] as { content?: Array<{ type: string; text?: string }> })?.content;
            const textBlock = content?.find((c) => c.type === 'text');
            if (textBlock?.text) text = textBlock.text;
          }
        } catch { /* keep raw */ }

        return (
          <div key={i} className={`${e.stream === 'STDERR' ? 'text-red-400' : ''} ${e.stream === 'SYSTEM' ? 'text-yellow-400' : ''}`}>
            {text}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
