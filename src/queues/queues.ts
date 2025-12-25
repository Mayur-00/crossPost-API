

import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.config.js";

export const XQueue = new Queue('x-post', {
    connection: redisConnection,
      defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
export const linkedinQueue = new Queue('linkedin-post', {
    connection: redisConnection,
      defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
export const postQueue = new Queue('post', {
    connection: redisConnection,
      defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
