import { Redis } from "ioredis";
import dotenv from 'dotenv';
dotenv.config();

const redisHost = process.env.REDIS_HOST;
const redisPort = parseInt(process.env.REDIS_PORT || '18173');
const redisPassword = process.env.REDIS_PASSWORD;

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Retrying Redis connection (attempt ${times})...`);
    return delay;
  },
});

redis.on("connect", () => {
  console.log("✓ Connected to Redis Cloud");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redis.on("close", () => {
  console.log("Redis connection closed"); 
});

// For BullMQ - NO TLS for port 18173
export const redisConnection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
};

export default redis;