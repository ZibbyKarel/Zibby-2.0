import { detectSuccess, parseStreamLine } from './claude-runner';
import { buildSubtaskPrompt } from './prompt-builder';

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

describe('buildSubtaskPrompt', () => {
  it('parses JSON acceptanceCriteria and numbers them', () => {
    const prompt = buildSubtaskPrompt({
      title: 'Add dark mode toggle',
      spec: 'Create a toggle button in the header.',
      acceptanceCriteria: JSON.stringify(['Toggle changes class', 'State persists']),
    });
    expect(prompt).toContain('Add dark mode toggle');
    expect(prompt).toContain('1. Toggle changes class');
    expect(prompt).toContain('2. State persists');
  });

  it('falls back to raw string when acceptanceCriteria is not valid JSON', () => {
    const prompt = buildSubtaskPrompt({
      title: 'Fix login bug',
      spec: 'Users cannot log in.',
      acceptanceCriteria: 'Login works correctly',
    });
    expect(prompt).toContain('Fix login bug');
    expect(prompt).toContain('Login works correctly');
  });

  it('includes mandatory instructions about not pushing', () => {
    const prompt = buildSubtaskPrompt({
      title: 'Test',
      spec: 'Test spec.',
      acceptanceCriteria: JSON.stringify(['AC1']),
    });
    expect(prompt).toContain('Do NOT push');
    expect(prompt).toContain('commit');
  });
});
