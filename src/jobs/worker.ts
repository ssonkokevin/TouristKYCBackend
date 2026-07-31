import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { handleSyncProviderAssignment } from "./syncProviderAssignment.js";
import { jobsLogger } from "../lib/logger.js";

export async function startJobWorkers() {
  const worker = new Worker(
    "sync-provider-assignment",
    async (job) => {
      const { subscriberId, simInventoryId, msisdnId } = job.data;
      jobsLogger.info("Job started", { job: job.name, jobId: job.id, subscriberId });
      await handleSyncProviderAssignment(subscriberId, simInventoryId, msisdnId);
    },
    { connection: redis as any }
  );

  worker.on("completed", (job) => {
    jobsLogger.info("Job completed", { job: job.name, jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    jobsLogger.error("Job failed", { job: job?.name, jobId: job?.id, error: err.message });
  });

  jobsLogger.info("Job workers started");
}
