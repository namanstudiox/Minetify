// Minimal in-memory fixed-window rate limiter.
//
// NOTE: state lives in this process only. That is fine for a single
// `next start` instance / local development, but in a serverless or
// multi-instance deployment each instance keeps its own counters, so the
// effective limits are per-instance. Swap this module for a shared store
// (Redis, database, Upstash, …) before deploying for real.

type Bucket = { count: number; limit: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 15 * 60 * 1000

function prune(now: number) {
  if (buckets.size < 5000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

function read(key: string): Bucket | undefined {
  const bucket = buckets.get(key)
  if (!bucket) return undefined
  if (bucket.resetAt <= Date.now()) {
    buckets.delete(key)
    return undefined
  }
  return bucket
}

function retryAfterSec(bucket: Bucket): number {
  return Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000))
}

/** Has this key already used up its limit? Does not count this call. */
export function isBlocked(key: string): { blocked: boolean; retryAfterSec: number } {
  const bucket = read(key)
  if (!bucket || bucket.count < bucket.limit) {
    return { blocked: false, retryAfterSec: 0 }
  }
  return { blocked: true, retryAfterSec: retryAfterSec(bucket) }
}

/** Count one occurrence against the key's limit and return the bucket. */
export function count(key: string, limit: number, windowMs: number = WINDOW_MS): Bucket {
  const now = Date.now()
  prune(now)
  let bucket = read(key)
  if (!bucket) {
    bucket = { count: 0, limit, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }
  bucket.count += 1
  return bucket
}

/** Reset a key, e.g. after a successful login clears the failure counter. */
export function clear(key: string) {
  buckets.delete(key)
}

/** First client IP from the standard proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
