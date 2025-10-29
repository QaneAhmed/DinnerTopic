type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 5 * 60 * 1000;
const LIMIT = 60;

export function rateLimit(ip: string | undefined): boolean {
  if (!ip) return true;
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= LIMIT) {
    return false;
  }
  bucket.count += 1;
  return true;
}

export function getRateLimitHint(): string {
  return `Limited to ${LIMIT} requests every ${WINDOW_MS / 60000} minutes per IP.`;
}
