/**
 * Love Meter ❤️ — In-memory sliding-window rate limiter.
 *
 * Sufficient for single-instance deployments. For multi-instance,
 * replace with a Redis-backed limiter.
 */

const buckets = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Periodic cleanup so the map never grows unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now > b.reset) buckets.delete(key);
  }
}, CLEANUP_INTERVAL).unref();

export function rateLimiter(windowMs = 60_000, maxRequests = 60, scope = 'global') {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${scope}:${ip}`;
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || now > bucket.reset) {
      buckets.set(key, { count: 1, reset: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please slow down and try again.' });
    }
    next();
  };
}

export default rateLimiter;
