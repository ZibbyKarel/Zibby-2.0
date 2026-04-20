import { detectSuccess, parseStreamLine } from './claude-runner';

describe('detectSuccess', () => {
  it('returns true when exit code 0, result success, and has new commits', () => {
    expect(detectSuccess({ exitCode: 0, resultSubtype: 'success', hasCommits: true })).toBe(true);
  });
  it('returns false when exit code non-zero', () => {
    expect(detectSuccess({ exitCode: 1, resultSubtype: 'success', hasCommits: true })).toBe(false);
  });
  it('returns false when resultSubtype is error', () => {
    expect(detectSuccess({ exitCode: 0, resultSubtype: 'error', hasCommits: true })).toBe(false);
  });
  it('returns false when no new commits', () => {
    expect(detectSuccess({ exitCode: 0, resultSubtype: 'success', hasCommits: false })).toBe(false);
  });
  it('returns false when resultSubtype is null', () => {
    expect(detectSuccess({ exitCode: 0, resultSubtype: null, hasCommits: true })).toBe(false);
  });
});

describe('parseStreamLine', () => {
  it('parses assistant message turn as log event', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Working...' }] },
    });
    const event = parseStreamLine(line);
    expect(event?.type).toBe('log');
    if (event?.type === 'log') {
      expect(event.stream).toBe('STDOUT');
      expect(event.line).toBe(line);
    }
  });

  it('parses result success', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'success', result: 'Done' });
    const event = parseStreamLine(line);
    expect(event?.type).toBe('result_success');
    if (event?.type === 'result_success') {
      expect(event.summary).toBe('Done');
    }
  });

  it('parses result error', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'error', error: 'Max turns reached' });
    const event = parseStreamLine(line);
    expect(event?.type).toBe('result_error');
    if (event?.type === 'result_error') {
      expect(event.error).toBe('Max turns reached');
    }
  });

  it('returns null for invalid JSON', () => {
    const event = parseStreamLine('not json {{{');
    expect(event).toBeNull();
  });

  it('returns null for unrecognized event type', () => {
    const line = JSON.stringify({ type: 'unknown_event_type', data: {} });
    const event = parseStreamLine(line);
    expect(event).toBeNull();
  });

  it('parses user event as log', () => {
    const line = JSON.stringify({ type: 'user', message: { content: [] } });
    const event = parseStreamLine(line);
    expect(event?.type).toBe('log');
  });
});
