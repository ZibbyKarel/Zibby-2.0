export type UsageWindow = {
  usedPercentage: number;
  resetsAt: number;
};

export type Usage = {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
  fetchedAt: number;
};

type HeaderGetter = (name: string) => string | null;

function toGetter(headers: Headers | Record<string, string>): HeaderGetter {
  if (headers instanceof Headers) return (name) => headers.get(name);
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return (name) => lower[name.toLowerCase()] ?? null;
}

function parseWindow(get: HeaderGetter, slug: '5h' | '7d'): UsageWindow | null {
  const util = get(`anthropic-ratelimit-unified-${slug}-utilization`);
  const reset = get(`anthropic-ratelimit-unified-${slug}-reset`);
  if (util === null || reset === null) return null;
  const utilNum = Number(util);
  const resetNum = Number(reset);
  if (!Number.isFinite(utilNum) || !Number.isFinite(resetNum)) return null;
  return { usedPercentage: Math.max(0, Math.min(100, utilNum * 100)), resetsAt: resetNum * 1000 };
}

export function parseUsageHeaders(
  headers: Headers | Record<string, string>,
  fetchedAt: number = Date.now()
): Usage | null {
  const get = toGetter(headers);
  const fiveHour = parseWindow(get, '5h');
  const sevenDay = parseWindow(get, '7d');
  if (!fiveHour && !sevenDay) return null;
  return { fiveHour, sevenDay, fetchedAt };
}
