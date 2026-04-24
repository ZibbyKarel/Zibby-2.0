import { describe, it, expect } from 'vitest';
import { parseUsageHeaders } from './parse-headers';

describe('parseUsageHeaders', () => {
  it('parses both windows from a real API response', () => {
    const headers = new Headers({
      'anthropic-ratelimit-unified-5h-status': 'allowed',
      'anthropic-ratelimit-unified-5h-reset': '1776963600',
      'anthropic-ratelimit-unified-5h-utilization': '0.3',
      'anthropic-ratelimit-unified-7d-status': 'allowed',
      'anthropic-ratelimit-unified-7d-reset': '1777039200',
      'anthropic-ratelimit-unified-7d-utilization': '0.37',
    });
    const usage = parseUsageHeaders(headers, 1700000000000);
    expect(usage).toEqual({
      fiveHour: { usedPercentage: 30, resetsAt: 1776963600000 },
      sevenDay: { usedPercentage: 37, resetsAt: 1777039200000 },
      fetchedAt: 1700000000000,
    });
  });

  it('returns null when no rate-limit headers present', () => {
    const headers = new Headers({ 'content-type': 'application/json' });
    expect(parseUsageHeaders(headers)).toBeNull();
  });

  it('returns the partial windows that are present', () => {
    const headers = new Headers({
      'anthropic-ratelimit-unified-5h-utilization': '0.9',
      'anthropic-ratelimit-unified-5h-reset': '123',
    });
    const usage = parseUsageHeaders(headers, 0);
    expect(usage).toEqual({
      fiveHour: { usedPercentage: 90, resetsAt: 123000 },
      sevenDay: null,
      fetchedAt: 0,
    });
  });

  it('clamps utilization to 0..100 in case the server reports >1', () => {
    const headers = new Headers({
      'anthropic-ratelimit-unified-5h-utilization': '1.5',
      'anthropic-ratelimit-unified-5h-reset': '1',
      'anthropic-ratelimit-unified-7d-utilization': '-0.5',
      'anthropic-ratelimit-unified-7d-reset': '2',
    });
    const usage = parseUsageHeaders(headers);
    expect(usage?.fiveHour?.usedPercentage).toBe(100);
    expect(usage?.sevenDay?.usedPercentage).toBe(0);
  });

  it('ignores non-numeric values', () => {
    const headers = new Headers({
      'anthropic-ratelimit-unified-5h-utilization': 'not-a-number',
      'anthropic-ratelimit-unified-5h-reset': '1',
    });
    expect(parseUsageHeaders(headers)).toBeNull();
  });

  it('accepts a plain record header map', () => {
    const usage = parseUsageHeaders({
      'Anthropic-RateLimit-Unified-5h-Utilization': '0.5',
      'anthropic-ratelimit-unified-5h-reset': '10',
    });
    expect(usage?.fiveHour).toEqual({ usedPercentage: 50, resetsAt: 10000 });
  });
});
