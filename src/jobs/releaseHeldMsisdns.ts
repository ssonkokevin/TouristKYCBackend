import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { jobsLogger } from "../lib/logger.js";

export default async function releaseHeldMsisdns() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.DEREGISTER_STALE_DAYS);

  const held = await prisma.msisdnPool.findMany({
    where: {
      status: "held",
      updatedAt: { lt: cutoff },
    },
  });

  for (const item of held) {
    await prisma.msisdnPool.update({
      where: { id: item.id },
      data: {
        status: "available",
        assignedSubscriberId: null,
        simInventoryId: null,
        reservedBy: null,
        reservedAt: null,
        reservationExpiresAt: null,
        providerConfirmationRef: null,
      },
    });
  }

  jobsLogger.info("Released held MSISDNs after 90-day hold", { count: held.length });
  return { released: held.length };
}
