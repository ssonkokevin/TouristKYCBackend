import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { handleSyncProviderAssignment } from "./syncProviderAssignment.js";
import { handleSendWelcomeSms } from "./sendWelcomeSms.js";
import { jobsLogger } from "../lib/logger.js";

export async function startJobWorkers() {
  const syncWorker = new Worker(
    "sync-provider-assignment",
    async (job) => {
      const { subscriberId, simInventoryId, msisdnId } = job.data;
      jobsLogger.info("Job started", { job: job.name, jobId: job.id, subscriberId });
      await handleSyncProviderAssignment(subscriberId, simInventoryId, msisdnId);
    },
    { connection: redis as any }
  );

  const welcomeSmsWorker = new Worker(
    "welcome-sms",
    async (job) => {
      const { subscriberId, phoneNumber } = job.data;
      jobsLogger.info("Welcome SMS job started", { jobId: job.id, subscriberId, phoneNumber });
      await handleSendWelcomeSms(subscriberId, phoneNumber);
    },
    { connection: redis as any }
  );

  syncWorker.on("completed", (job) => {
    jobsLogger.info("Job completed", { job: job.name, jobId: job.id });
  });

  syncWorker.on("failed", (job, err) => {
    jobsLogger.error("Job failed", { job: job?.name, jobId: job?.id, error: err.message });
  });

  welcomeSmsWorker.on("completed", (job) => {
    jobsLogger.info("Welcome SMS job completed", { jobId: job.id });
  });

  welcomeSmsWorker.on("failed", (job, err) => {
    jobsLogger.error("Welcome SMS job failed", { jobId: job?.id, error: err.message });
  });

  jobsLogger.info("Job workers started");
}
