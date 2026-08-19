import "server-only";
import { headers } from "next/headers";

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Per-process, in-memory sliding window. Good enough for a single Render
// instance; if this ever runs as multiple instances, move to a shared
// store (DB table or Redis) since each instance would track its own count.
const WINDOW_MS = 10 * 60 * 1000;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
  }
}

/**
 * Returns true if `scope:identity` is still under `limit` requests within
 * the current 10-minute window. Increments the count as a side effect —
 * call once per actual attempt.
 */
export function checkRateLimit(scope: string, identity: string, limit: number): boolean {
  const now = Date.now();
  if (Math.random() < 0.02) sweep(now);

  const key = `${scope}:${identity}`;
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return hdrs.get("x-real-ip") ?? "unknown";
}
