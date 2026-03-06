import { getRedisClient, getRedisClientType } from "./redisClient.js";

const DEFAULT_TTL_SECONDS = 120;

const parseCachedValue = (raw) => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const cacheGet = async (key) => {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    return parseCachedValue(data);
  } catch (error) {
    console.error(`Cache get failed (${key}):`, error.message);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const payload = JSON.stringify(value);
    const clientType = getRedisClientType();

    if (clientType === "node-redis") {
      await redis.set(key, payload, { EX: ttlSeconds });
      return;
    }

    await redis.set(key, payload, { ex: ttlSeconds });
  } catch (error) {
    console.error(`Cache set failed (${key}):`, error.message);
  }
};

export const cacheDel = async (...keys) => {
  const redis = getRedisClient();
  if (!redis || keys.length === 0) return;

  try {
    const validKeys = keys.filter(Boolean);
    if (validKeys.length === 0) return;
    await redis.del(...validKeys);
  } catch (error) {
    console.error(`Cache delete failed (${keys.join(", ")}):`, error.message);
  }
};

export const cacheDelByPrefix = async (prefix) => {
  const redis = getRedisClient();
  if (!redis || !prefix) return;

  try {
    const keysToDelete = [];
    const pattern = `${prefix}*`;
    const clientType = getRedisClientType();

    if (clientType === "node-redis" && typeof redis.scanIterator === "function") {
      for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keysToDelete.push(key);
      }
    } else if (typeof redis.keys === "function") {
      const found = await redis.keys(pattern);
      if (Array.isArray(found)) {
        keysToDelete.push(...found);
      }
    }

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
  } catch (error) {
    console.error(`Cache prefix delete failed (${prefix}):`, error.message);
  }
};
