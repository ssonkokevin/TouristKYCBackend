import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

export const syncProviderQueue = new Queue("sync-provider-assignment", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export async function queueSyncProviderAssignment(payload: {
  subscriberId: string;
  simInventoryId: string;
  msisdnId: string;
}) {
  await syncProviderQueue.add("sync-provider-assignment", payload);
}
