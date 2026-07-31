import { prisma } from "../lib/prisma.js";
import { deregisterFromSuspension } from "../services/subscriberLifecycle.js";
import { config } from "../config.js";
import { jobsLogger } from "../lib/logger.js";

export default async function deregisterStaleSuspensions() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.DEREGISTER_STALE_DAYS);

  const stale = await prisma.suspension.findMany({
    where: {
      reason: "visa_expired",
      suspendedAt: { lt: cutoff },
    },
  });

  for (const s of stale) {
    await deregisterFromSuspension(s.subscriberId);
  }

  jobsLogger.info("Deregistered stale suspensions", { count: stale.length });
}
