import { useEffect, useMemo, useRef, useState } from 'react';

type LogEntry = { stream: 'stdout' | 'stderr' | 'info'; line: string; ts: number };

export function LogPanel({ logs }: { logs: LogEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = useMemo(() => (expanded ? logs : logs.slice(-12)), [logs, expanded]);
  const scrollRef = useRef<HTMLPreElement>(null);
  const atBottom = useRef(true);
  const prevExpanded = useRef(false);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (expanded && !prevExpanded.current) {
      scrollToBottom();
      atBottom.current = true;
    }
    prevExpanded.current = expanded;
  }, [expanded]);

  useEffect(() => {
    if (expanded && atBottom.current) {
      scrollToBottom();
    }
  }, [logs, expanded]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 10;
  };

  return (
    <div className="space-y-1">
      <pre
        ref={scrollRef}
        onScroll={handleScroll}
        className={`text-[11px] leading-tight font-mono bg-neutral-950/60 border border-neutral-800 rounded p-2 overflow-y-auto whitespace-pre-wrap break-words ${expanded ? 'max-h-[32rem]' : 'max-h-48'}`}
      >
        {visible.map((l, i) => (
          <div
            key={i}
            className={
              l.stream === 'stderr' ? 'text-rose-300' : l.stream === 'info' ? 'text-sky-300' : 'text-neutral-300'
            }
          >
            {l.line}
          </div>
        ))}
      </pre>
      {logs.length > 12 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          {expanded ? 'Collapse log' : `Show full log (${logs.length} lines)`}
        </button>
      )}
    </div>
  );
}
