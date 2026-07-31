import { Queue, Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { jobsLogger } from "../lib/logger.js";
import releaseExpiredReservations from "./releaseExpiredReservations.js";
import releaseOrphanedProvisioned from "./releaseOrphanedProvisioned.js";
import suspendExpiredVisas from "./suspendExpiredVisas.js";
import deregisterStaleSuspensions from "./deregisterStaleSuspensions.js";
import notifyExpiringVisas from "./notifyExpiringVisas.js";
import reconcileStaleSyncs from "./reconcileStaleSyncs.js";

const scheduler = new Queue("job-scheduler", { connection: redis as any });

const TASKS: Record<string, () => Promise<void>> = {
  "release-expired-reservations": releaseExpiredReservations,
  "release-orphaned-provisioned": releaseOrphanedProvisioned,
  "suspend-expired-visas": suspendExpiredVisas,
  "deregister-stale-suspensions": deregisterStaleSuspensions,
  "notify-expiring-visas": notifyExpiringVisas,
  "reconcile-stale-syncs": reconcileStaleSyncs,
};

export function startJobSchedulers() {
  scheduler.add("release-expired-reservations", {}, { repeat: { every: 30000 }, jobId: "release-expired-reservations" });
  scheduler.add("release-orphaned-provisioned", {}, { repeat: { every: 300000 }, jobId: "release-orphaned-provisioned" });
  scheduler.add("suspend-expired-visas", {}, { repeat: { pattern: "0 2 * * *" }, jobId: "suspend-expired-visas" });
  scheduler.add("deregister-stale-suspensions", {}, { repeat: { pattern: "0 3 * * *" }, jobId: "deregister-stale-suspensions" });
  scheduler.add("notify-expiring-visas", {}, { repeat: { pattern: "0 6 * * *" }, jobId: "notify-expiring-visas" });
  scheduler.add("reconcile-stale-syncs", {}, { repeat: { every: 3600000 }, jobId: "reconcile-stale-syncs" });

  const schedulerWorker = new Worker(
    "job-scheduler",
    async (job) => {
      jobsLogger.info("Scheduled job started", { job: job.name, jobId: job.id });
      const task = TASKS[job.name];
      if (task) await task();
    },
    { connection: redis as any }
  );

  schedulerWorker.on("completed", (job) => {
    jobsLogger.info("Scheduled job completed", { job: job.name, jobId: job.id });
  });

  schedulerWorker.on("failed", (job, err) => {
    jobsLogger.error("Scheduled job failed", { job: job?.name, jobId: job?.id, error: err.message });
  });

  jobsLogger.info("Job schedulers started");
}
