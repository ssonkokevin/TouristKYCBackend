import { prisma } from "../lib/prisma.js";
import { suspendSubscriber } from "../services/subscriberLifecycle.js";
import { createNotification } from "../services/notificationsService.js";
import { emitSubscriberSuspended } from "../sockets/index.js";
import { config } from "../config.js";
import { jobsLogger } from "../lib/logger.js";

export default async function suspendExpiredVisas() {
  const threshold = new Date();
  threshold.setHours(threshold.getHours() + config.VISA_SUSPEND_LEAD_HOURS);

  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: "active",
      visaExpiryDate: { lte: threshold },
    },
    include: { simInventory: true, msisdnPool: { take: 1 } },
  });

  for (const sub of subscribers) {
    await suspendSubscriber(sub.id, "visa_expired", undefined, "System (auto)");
    await createNotification({
      type: "visa_expired_suspended",
      subscriberId: sub.id,
      title: "Visa expired — subscriber suspended",
      body: `Subscriber ${sub.surname} ${sub.otherNames} has been suspended due to visa expiry.`,
    });
    emitSubscriberSuspended(sub);
  }

  jobsLogger.info("Suspended subscribers due to visa expiry", { count: subscribers.length });
}
