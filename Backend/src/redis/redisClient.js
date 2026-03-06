import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient } from "redis";

let redisClient = null;
let clientType = null;

export const connectRedis = async () => {
  if (redisClient && (clientType === "upstash-rest" || redisClient?.isOpen)) {
    return redisClient;
  }

  const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashRestToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashRestUrl && upstashRestToken) {
    redisClient = new UpstashRedis({
      url: upstashRestUrl,
      token: upstashRestToken,
    });
    clientType = "upstash-rest";
    console.log("Upstash Redis (REST) client ready");
    return redisClient;
  }

  const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

  if (!redisUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Redis config missing. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or UPSTASH_REDIS_URL/REDIS_URL"
      );
    }

    console.warn("Redis skipped: no Redis/Upstash environment variables found");
    return null;
  }

  redisClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
    pingInterval: 10000,
  });

  redisClient.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  redisClient.on("connect", () => {
    console.log("Redis socket connected");
  });

  redisClient.on("ready", () => {
    console.log("Redis client ready");
  });

  redisClient.on("reconnecting", () => {
    console.warn("Redis reconnecting...");
  });

  redisClient.on("end", () => {
    console.warn("Redis connection closed");
  });

  await redisClient.connect();
  clientType = "node-redis";
  return redisClient;
};

export const getRedisClient = () => redisClient;
export const getRedisClientType = () => clientType;

export const disconnectRedis = async () => {
  if (clientType === "node-redis" && redisClient?.isOpen) {
    await redisClient.quit();
  }
  redisClient = null;
  clientType = null;
};
