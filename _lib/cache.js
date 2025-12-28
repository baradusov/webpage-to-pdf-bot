const cache = new Map();

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

export const getFromCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

export const setInCache = (key, value, ttl = DEFAULT_TTL) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
};

export const clearExpired = () => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
};

setInterval(clearExpired, 10 * 60 * 1000);
