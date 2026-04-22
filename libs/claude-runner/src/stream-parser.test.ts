import { describe, expect, it } from 'vitest';
import { parseLine, renderEvent } from './stream-parser';

describe('parseLine', () => {
  it('returns null on empty/whitespace lines', () => {
    expect(parseLine('')).toBeNull();
    expect(parseLine('   ')).toBeNull();
  });

  it('returns null on invalid JSON', () => {
    expect(parseLine('not json')).toBeNull();
    expect(parseLine('{"unclosed')).toBeNull();
  });

  it('parses a valid JSON line into an object', () => {
    const parsed = parseLine('{"type":"system","subtype":"init"}');
    expect(parsed).toEqual({ type: 'system', subtype: 'init' });
  });
});

describe('renderEvent', () => {
  it('surfaces an info line for system/init', () => {
    const events = renderEvent({ type: 'system', subtype: 'init', model: 'claude-sonnet-4-6' });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('info');
    expect(events[0].line).toContain('claude-sonnet-4-6');
  });

  it('emits a text event for assistant text blocks', () => {
    const events = renderEvent({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Hello there' }] },
    });
    expect(events).toEqual([{ kind: 'text', line: 'Hello there' }]);
  });

  it('emits a tool event with a Bash one-liner summary', () => {
    const events = renderEvent({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'Bash',
            input: { command: 'git status\nmore stuff' },
          },
        ],
      },
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('tool');
    expect(events[0].line).toBe('Bash(git status)');
  });

  it('summarizes Read/Write/Edit by file path', () => {
    const events = renderEvent({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 't', name: 'Read', input: { file_path: '/a/b.ts' } }],
      },
    });
    expect(events[0].line).toBe('Read(/a/b.ts)');
  });

  it('surfaces a tool error from a user/tool_result block', () => {
    const events = renderEvent({
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 't1',
            content: 'boom',
            is_error: true,
          },
        ],
      },
    });
    expect(events[0].kind).toBe('error');
    expect(events[0].line).toContain('boom');
  });

  it('ignores successful tool_result events', () => {
    const events = renderEvent({
      type: 'user',
      message: {
        content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }],
      },
    });
    expect(events).toHaveLength(0);
  });

  it('emits a done event with is_error/stop_reason metadata for result', () => {
    const events = renderEvent({
      type: 'result',
      subtype: 'success',
      is_error: false,
      stop_reason: 'end_turn',
      result: 'done',
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('done');
    expect(events[0].meta).toMatchObject({ is_error: false, stop_reason: 'end_turn' });
  });

  it('truncates long assistant text to 500 chars', () => {
    const long = 'x'.repeat(1000);
    const events = renderEvent({
      type: 'assistant',
      message: { content: [{ type: 'text', text: long }] },
    });
    expect(events[0].line.length).toBeLessThanOrEqual(500);
  });
});
