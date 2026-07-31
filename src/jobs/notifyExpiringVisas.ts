import { prisma } from "../lib/prisma.js";
import { createNotification } from "../services/notificationsService.js";
import { jobsLogger } from "../lib/logger.js";

export default async function notifyExpiringVisas() {
  const now = new Date();
  const week = new Date();
  week.setDate(week.getDate() + 7);

  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: "active",
      visaExpiryDate: { gte: now, lte: week },
    },
  });

  for (const sub of subscribers) {
    await createNotification({
      type: "visa_expiring_soon",
      subscriberId: sub.id,
      title: "Visa expiring soon",
      body: `Subscriber ${sub.surname} ${sub.otherNames} visa expires on ${sub.visaExpiryDate.toDateString()}.`,
    });
  }

  jobsLogger.info("Created visa-expiring-soon notifications", { count: subscribers.length });
}
