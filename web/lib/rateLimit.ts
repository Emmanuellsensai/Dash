// Simple in-memory per-IP rate limit. Good enough for a small cohort.
// For serverless-many-region use, swap for Upstash Redis.

const bucket = new Map<string, number>();
const WINDOW_MS = 30_000;

export function allow(ip: string): boolean {
  const now = Date.now();
  const last = bucket.get(ip) ?? 0;
  if (now - last < WINDOW_MS) return false;
  bucket.set(ip, now);
  return true;
}
