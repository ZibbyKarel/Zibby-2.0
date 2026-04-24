/**
 * Claude CLI signals a usage/rate limit in a few ways:
 * - Assistant/result text containing `Claude AI usage limit reached|<epoch_seconds>`
 * - Free-form error text: `Claude usage limit reached`, `usage limit reached`,
 *   `rate limit`, `429`.
 *
 * We treat any of those as a limit hit and try to recover the reset timestamp
 * from the pipe-delimited form. Anything else falls through.
 */
const PIPE_TS_RE = /Claude(?:\s+AI)?\s+usage\s+limit\s+reached\s*\|\s*(\d+)/i;
const GENERIC_USAGE_LIMIT_RE = /Claude(?:\s+AI)?\s+usage\s+limit\s+reached/i;
const GENERIC_RATE_LIMIT_RE = /\b(rate[- ]?limit(?:ed|ing)?|too\s+many\s+requests)\b/i;
const HTTP_429_RE = /\b(?:HTTP\s*)?429\b/;

export type LimitDetection = {
  hit: boolean;
  /** Epoch ms if we could parse one; null otherwise. */
  resetsAt: number | null;
};

export function detectLimitInText(text: string): LimitDetection {
  if (!text) return { hit: false, resetsAt: null };
  const pipeMatch = PIPE_TS_RE.exec(text);
  if (pipeMatch) {
    const secs = Number(pipeMatch[1]);
    const resetsAt = Number.isFinite(secs) && secs > 0 ? secs * 1000 : null;
    return { hit: true, resetsAt };
  }
  if (GENERIC_USAGE_LIMIT_RE.test(text)) return { hit: true, resetsAt: null };
  if (GENERIC_RATE_LIMIT_RE.test(text)) return { hit: true, resetsAt: null };
  if (HTTP_429_RE.test(text)) return { hit: true, resetsAt: null };
  return { hit: false, resetsAt: null };
}
