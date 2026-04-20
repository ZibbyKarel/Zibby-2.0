import { isValidJobTransition, isValidSubtaskTransition } from './state-machine';

describe('Job state machine', () => {
  it('allows PENDING → DECOMPOSING', () => {
    expect(isValidJobTransition('PENDING', 'DECOMPOSING')).toBe(true);
  });
  it('allows DECOMPOSING → RUNNING', () => {
    expect(isValidJobTransition('DECOMPOSING', 'RUNNING')).toBe(true);
  });
  it('allows RUNNING → COMPLETED', () => {
    expect(isValidJobTransition('RUNNING', 'COMPLETED')).toBe(true);
  });
  it('allows RUNNING → PARTIALLY_COMPLETED', () => {
    expect(isValidJobTransition('RUNNING', 'PARTIALLY_COMPLETED')).toBe(true);
  });
  it('allows RUNNING → FAILED', () => {
    expect(isValidJobTransition('RUNNING', 'FAILED')).toBe(true);
  });
  it('allows DECOMPOSING → FAILED', () => {
    expect(isValidJobTransition('DECOMPOSING', 'FAILED')).toBe(true);
  });
  it('rejects COMPLETED → RUNNING', () => {
    expect(isValidJobTransition('COMPLETED', 'RUNNING')).toBe(false);
  });
  it('rejects PENDING → COMPLETED', () => {
    expect(isValidJobTransition('PENDING', 'COMPLETED')).toBe(false);
  });
});

describe('Subtask state machine', () => {
  it('allows QUEUED → RUNNING', () => {
    expect(isValidSubtaskTransition('QUEUED', 'RUNNING')).toBe(true);
  });
  it('allows RUNNING → PUSHING', () => {
    expect(isValidSubtaskTransition('RUNNING', 'PUSHING')).toBe(true);
  });
  it('allows PUSHING → PR_CREATED', () => {
    expect(isValidSubtaskTransition('PUSHING', 'PR_CREATED')).toBe(true);
  });
  it('allows RUNNING → FAILED', () => {
    expect(isValidSubtaskTransition('RUNNING', 'FAILED')).toBe(true);
  });
  it('allows PUSHING → FAILED', () => {
    expect(isValidSubtaskTransition('PUSHING', 'FAILED')).toBe(true);
  });
  it('rejects PR_CREATED → RUNNING', () => {
    expect(isValidSubtaskTransition('PR_CREATED', 'RUNNING')).toBe(false);
  });
});

describe('Edge cases', () => {
  it('returns false for unknown from-state', () => {
    expect(isValidJobTransition('NONEXISTENT', 'RUNNING')).toBe(false);
  });
  it('returns false for unknown to-state', () => {
    expect(isValidJobTransition('PENDING', 'NONEXISTENT')).toBe(false);
  });
});
