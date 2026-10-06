import { prisma } from "../lib/prisma.js";
import { createNotification } from "../services/notificationsService.js";
import { jobsLogger } from "../lib/logger.js";
import { sendWelcomeSms } from "../services/welcomeSmsClient.js";
import { buildVisaExpiryWarningSms } from "../services/smsTemplates.js";

export default async function notifyExpiringVisas() {
  const now = new Date();
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + 14);
  const warningStart = new Date(warningDate);
  warningStart.setHours(0, 0, 0, 0);
  const warningEnd = new Date(warningDate);
  warningEnd.setHours(23, 59, 59, 999);

  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: "active",
      visaExpiryDate: { gte: warningStart, lte: warningEnd },
    },
    include: { msisdnPool: { take: 1 } },
  });

  for (const sub of subscribers) {
    const expiryDate = new Date(sub.visaExpiryDate);
    const msisdn = sub.msisdnPool[0]?.msisdn;
    if (!msisdn) continue;

    const message = buildVisaExpiryWarningSms({
      firstName: sub.otherNames.split(" ")[0],
      visaExpiryDate: expiryDate,
      msisdn,
    });

    try {
      await sendWelcomeSms({ phoneNumber: msisdn, message });
      await createNotification({
        type: "visa_expiring_soon",
        subscriberId: sub.id,
        title: "Visa expiry warning",
        body: `Your visa expires on ${expiryDate.toDateString()}. Your mobile number will be suspended unless it is renewed.`,
      });
    } catch (error) {
      jobsLogger.error("Visa expiry warning SMS failed", {
        subscriberId: sub.id,
        phoneNumber: msisdn,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  jobsLogger.info("Processed visa-expiring-soon SMS notifications", { count: subscribers.length });
}
