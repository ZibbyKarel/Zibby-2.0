import { describe, it, expect } from 'vitest';
import { detectLimitInText } from './detect-limit';

describe('detectLimitInText', () => {
  it('parses the pipe-delimited reset timestamp', () => {
    const r = detectLimitInText('Claude AI usage limit reached|1776963600');
    expect(r.hit).toBe(true);
    expect(r.resetsAt).toBe(1776963600000);
  });

  it('matches the bare usage-limit phrase without a timestamp', () => {
    const r = detectLimitInText('Sorry — Claude usage limit reached. Try again later.');
    expect(r.hit).toBe(true);
    expect(r.resetsAt).toBeNull();
  });

  it('matches 429 in error text', () => {
    const r = detectLimitInText('Request failed with status 429');
    expect(r.hit).toBe(true);
    expect(r.resetsAt).toBeNull();
  });

  it('matches "rate limit" phrasing', () => {
    const r = detectLimitInText('You are being rate-limited.');
    expect(r.hit).toBe(true);
    expect(r.resetsAt).toBeNull();
  });

  it('returns hit:false for unrelated text', () => {
    expect(detectLimitInText('all good, commit landed')).toEqual({ hit: false, resetsAt: null });
  });

  it('returns hit:false on empty input', () => {
    expect(detectLimitInText('')).toEqual({ hit: false, resetsAt: null });
  });

  it('ignores a non-numeric timestamp and still flags as hit', () => {
    const r = detectLimitInText('Claude AI usage limit reached|notanumber');
    expect(r.hit).toBe(true);
    expect(r.resetsAt).toBeNull();
  });
});
