type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (current.count >= limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  return { ok: true, remaining: limit - current.count };
}

export function requestKey(req: Request, prefix: string) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `${prefix}:${forwarded || req.headers.get('x-real-ip') || 'unknown'}`;
}
