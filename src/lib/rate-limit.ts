/**
 * Minimal fixed-window rate limiter keyed by client IP.
 *
 * State is per server instance (in memory), so it's a speed bump against
 * scripted abuse of the paid Google Places / AI endpoints rather than a hard
 * global quota — but it stops a single client from hammering an instance.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

async function clientKey(): Promise<string> {
  try {
    // Loaded lazily so this server-only module never lands in the client bundle.
    const { getRequestIP } = await import("@tanstack/react-start/server");
    return getRequestIP({ xForwardedFor: true }) ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Returns true when the call is allowed. `scope` separates budgets for
 * different endpoints (e.g. "places" vs "ai").
 */
export async function allowRequest(
  scope: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const key = `${scope}:${await clientKey()}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export const RATE_LIMIT_MESSAGE = "יותר מדי חיפושים בזמן קצר – נסו שוב בעוד דקה";
