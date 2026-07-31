import { Redis } from "ioredis";
import { config } from "../config.js";
import { backendLogger } from "./logger.js";

export const redisUrl = config.REDIS_URL;
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

redis.on("error", (err: NodeJS.ErrnoException) => {
  backendLogger.warn("Redis connection error", { code: err.code, message: err.message });
});

redis.on("connect", () => {
  backendLogger.info("Redis connected");
});
