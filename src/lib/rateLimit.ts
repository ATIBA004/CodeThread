type Bucket = { count: number; reset: number };

const store = new Map<string, Bucket>();

function now() {
  return Date.now();
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const t = now();
  let b = store.get(key);
  if (!b || t > b.reset) {
    b = { count: 0, reset: t + windowMs };
    store.set(key, b);
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.reset - t) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

export function clientKey(headers: Headers, prefix: string): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
  return `${prefix}:${ip}`;
}
