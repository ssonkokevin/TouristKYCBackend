import { prisma } from "../lib/prisma.js";
import { jobsLogger } from "../lib/logger.js";
import { sendWelcomeSms } from "../services/welcomeSmsClient.js";

export async function handleSendWelcomeSms(subscriberId: string, phoneNumber: string) {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { id: true, status: true, msisdnPool: { take: 1, select: { msisdn: true } } },
  });

  if (!subscriber) {
    throw new Error(`Subscriber not found: ${subscriberId}`);
  }

  if (subscriber.status !== "active") {
    jobsLogger.warn("Skipping welcome SMS for non-active subscriber", { subscriberId, status: subscriber.status });
    return;
  }

  const msisdn = subscriber.msisdnPool[0]?.msisdn ?? phoneNumber;
  const message = `Welcome to Uganda. Your eSIM is ready. Please keep your SIM active and contact the service desk if you need assistance.`;

  try {
    const response = await sendWelcomeSms({ phoneNumber: msisdn, message });
    jobsLogger.info("Welcome SMS accepted by BSAG", { subscriberId, phoneNumber: msisdn, response });
  } catch (error) {
    jobsLogger.error("Welcome SMS failed", {
      subscriberId,
      phoneNumber: msisdn,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
