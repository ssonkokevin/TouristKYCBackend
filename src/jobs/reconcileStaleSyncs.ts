import { prisma } from "../lib/prisma.js";
import { queueSyncProviderAssignment } from "./queue.js";
import { jobsLogger } from "../lib/logger.js";

export default async function reconcileStaleSyncs() {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - 10);

  const stale = await prisma.providerSyncLog.findMany({
    where: {
      status: "pending",
      createdAt: { lt: cutoff },
    },
    include: { subscriber: { include: { msisdnPool: { take: 1 } } } },
  });

  for (const log of stale) {
    const msisdnId = log.subscriber?.msisdnPool[0]?.id;
    if (log.simInventoryId && msisdnId && log.subscriberId) {
      await queueSyncProviderAssignment({
        subscriberId: log.subscriberId,
        simInventoryId: log.simInventoryId,
        msisdnId,
      });
    }
  }

  jobsLogger.info("Requeued stale sync logs", { count: stale.length });
}
