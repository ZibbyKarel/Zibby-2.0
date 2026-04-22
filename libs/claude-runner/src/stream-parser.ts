export type ClaudeEvent =
  | { type: 'system'; subtype: string; [key: string]: unknown }
  | { type: 'assistant'; message: { content: AssistantBlock[] }; [key: string]: unknown }
  | { type: 'user'; message: { content: UserBlock[] }; [key: string]: unknown }
  | { type: 'result'; subtype: string; is_error: boolean; result?: string; stop_reason?: string; [key: string]: unknown }
  | { type: string; [key: string]: unknown };

export type AssistantBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'thinking'; thinking: string }
  | { type: string; [key: string]: unknown };

export type UserBlock =
  | { type: 'tool_result'; tool_use_id: string; content: string | unknown[]; is_error?: boolean }
  | { type: string; [key: string]: unknown };

export type HumanReadable = {
  kind: 'text' | 'tool' | 'tool-result' | 'info' | 'error' | 'done';
  line: string;
  meta?: Record<string, unknown>;
};

export function parseLine(raw: string): ClaudeEvent | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as ClaudeEvent;
  } catch {
    return null;
  }
}

function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  if (name === 'Bash' && typeof input['command'] === 'string') {
    return (input['command'] as string).split('\n')[0].slice(0, 120);
  }
  if ((name === 'Read' || name === 'Write' || name === 'Edit') && typeof input['file_path'] === 'string') {
    return input['file_path'] as string;
  }
  if (name === 'Glob' && typeof input['pattern'] === 'string') {
    return input['pattern'] as string;
  }
  if (name === 'Grep' && typeof input['pattern'] === 'string') {
    const path = typeof input['path'] === 'string' ? ` in ${input['path']}` : '';
    return `${input['pattern']}${path}`;
  }
  const keys = Object.keys(input).slice(0, 2);
  return keys.map((k) => `${k}=${truncate(String(input[k]), 40)}`).join(', ');
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export function renderEvent(event: ClaudeEvent): HumanReadable[] {
  const out: HumanReadable[] = [];
  if (event.type === 'system' && typeof event['subtype'] === 'string') {
    if (event['subtype'] === 'init') {
      const model = typeof event['model'] === 'string' ? event['model'] : '?';
      out.push({ kind: 'info', line: `session started (model=${model})` });
    }
    return out;
  }
  if (event.type === 'assistant') {
    const blocks = (event as { message: { content?: AssistantBlock[] } }).message?.content ?? [];
    for (const block of blocks) {
      if (block.type === 'text' && typeof (block as { text?: string }).text === 'string') {
        const text = (block as { text: string }).text.trim();
        if (text) out.push({ kind: 'text', line: truncate(text, 500) });
      } else if (block.type === 'tool_use') {
        const b = block as { name: string; input: Record<string, unknown> };
        out.push({
          kind: 'tool',
          line: `${b.name}(${summarizeToolInput(b.name, b.input ?? {})})`,
          meta: { tool: b.name, input: b.input },
        });
      }
    }
    return out;
  }
  if (event.type === 'user') {
    const blocks = (event as { message: { content?: UserBlock[] } }).message?.content ?? [];
    for (const block of blocks) {
      if (block.type === 'tool_result') {
        const b = block as { is_error?: boolean; content: string | unknown[] };
        const text = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
        if (b.is_error) {
          out.push({ kind: 'error', line: `tool error: ${truncate(text.replace(/\s+/g, ' '), 200)}` });
        }
      }
    }
    return out;
  }
  if (event.type === 'result') {
    const e = event as { subtype: string; is_error: boolean; stop_reason?: string; result?: string };
    out.push({
      kind: 'done',
      line: `done: subtype=${e.subtype}, is_error=${e.is_error}, stop_reason=${e.stop_reason ?? '?'}`,
      meta: { is_error: e.is_error, stop_reason: e.stop_reason, result: e.result },
    });
    return out;
  }
  return out;
}
