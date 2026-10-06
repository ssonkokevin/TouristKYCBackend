import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

export interface WelcomeSmsJobData {
  subscriberId: string;
  phoneNumber: string;
}

export const welcomeSmsQueue = new Queue("welcome-sms", {
  connection: redis as any,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 5,
    backoff: { type: "exponential", delay: 30000 },
  },
});

export async function queueWelcomeSms(payload: WelcomeSmsJobData, delayMs: number) {
  await welcomeSmsQueue.add("send-welcome-sms", payload, { delay: delayMs });
}
