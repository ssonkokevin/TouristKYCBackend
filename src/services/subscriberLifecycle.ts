import { prisma } from "../lib/prisma.js";
import { auditLogger } from "../lib/logger.js";
import { emitSubscriberDeregistered } from "../sockets/index.js";
import { suspendMsisdnWithProvider, terminateMsisdnWithProvider } from "./providerLifecycleClient.js";
import { sendWelcomeSms } from "./welcomeSmsClient.js";
import { buildSuspendedSms } from "./smsTemplates.js";

export async function suspendSubscriber(
  subscriberId: string,
  reason: "visa_expired" | "manual_review" | "fraud_suspected" | "payment_issue" | "other",
  reasonNote: string | undefined,
  suspendedBy: string
) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscriber.findUnique({
      where: { id: subscriberId },
      include: { simInventory: true, msisdnPool: { take: 1 } },
    });
    if (!sub) throw new Error("Subscriber not found");

    const msisdn = sub.msisdnPool[0]?.msisdn;
    if (!msisdn) throw new Error("Subscriber has no assigned MSISDN");

    auditLogger.info("Attempting subscriber suspension via BSAG", {
      subscriberId,
      msisdn,
      reason,
      suspendedBy,
      passportNumber: sub.passportNumber,
      status: sub.status,
    });

    await suspendMsisdnWithProvider(msisdn);

    await tx.subscriber.update({ where: { id: subscriberId }, data: { status: "suspended" } });

    auditLogger.info("Subscriber suspended successfully", {
      subscriberId,
      msisdn,
      reason,
      suspendedBy,
      passportNumber: sub.passportNumber,
    });

    await tx.suspension.create({
      data: { subscriberId, reason, reasonNote, suspendedBy },
    });

    await tx.msisdnPool.update({ where: { id: sub.msisdnPool[0].id }, data: { status: "suspended" } });
    if (sub.simInventory) {
      await tx.simInventory.update({ where: { id: sub.simInventory.id }, data: { status: "suspended" } });
    }

    if (sub.msisdnPool[0]?.msisdn) {
      try {
        await sendWelcomeSms({
          phoneNumber: sub.msisdnPool[0].msisdn,
          message: buildSuspendedSms({ msisdn: sub.msisdnPool[0].msisdn }),
        });
      } catch (error) {
        // Fail the local suspension only if the provider suspension fails.
        // SMS delivery failure must not block the customer lifecycle.
        console.error("Suspension SMS delivery failed", error);
      }
    }

    return sub;
  });
}

export async function reactivateSubscriber(_subscriberId: string) {
  const error = new Error("Subscriber reactivation via BSAG is not yet implemented.");
  (error as any).statusCode = 501;
  throw error;
}

export async function deregisterSubscriber(
  subscriberId: string,
  reason: "visa_expired_deregistered" | "lost_card" | "change_of_number" | "customer_not_interested" | "voluntary_deregistration" | "fraud_suspected" | "other",
  reasonNote: string | undefined,
  operator: string
) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscriber.findUnique({
      where: { id: subscriberId },
      include: { simInventory: true, msisdnPool: { take: 1 } },
    });
    if (!sub) throw new Error("Subscriber not found");

    const msisdn = sub.msisdnPool[0]?.msisdn;
    if (!msisdn) throw new Error("Subscriber has no assigned MSISDN");

    await terminateMsisdnWithProvider(msisdn);

    await tx.subscriber.update({
      where: { id: subscriberId },
      data: { status: "deregistered", simInventoryId: null, msisdnId: null },
    });

    await tx.suspension.deleteMany({ where: { subscriberId } });
    await tx.deregistration.create({ data: { subscriberId, reason, reasonNote, operator } });

    const msisdnRecord = sub.msisdnPool[0];
    if (msisdnRecord) {
      await tx.msisdnPool.update({
        where: { id: msisdnRecord.id },
        data: {
          status: "held",
          assignedSubscriberId: null,
          simInventoryId: null,
          reservedBy: null,
          reservedAt: null,
          reservationExpiresAt: null,
        },
      });
    }

    if (sub.simInventory) {
      await tx.simInventory.update({
        where: { id: sub.simInventory.id },
        data: {
          status: "deactivated",
          reservedBy: null,
          reservedAt: null,
          reservationExpiresAt: null,
          provisionedAt: null,
          providerConfirmationRef: null,
        },
      });
    }

    return sub;
  });
}

export async function deregisterFromSuspension(subscriberId: string) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscriber.findUnique({
      where: { id: subscriberId },
      include: { simInventory: true, msisdnPool: { take: 1 } },
    });
    if (!sub) throw new Error("Subscriber not found");

    const msisdn = sub.msisdnPool[0]?.msisdn;
    if (!msisdn) throw new Error("Subscriber has no assigned MSISDN");

    auditLogger.info("Auto-deregistering suspended subscriber via BSAG", {
      subscriberId,
      msisdn,
      reason: "visa_expired_deregistered",
      operator: "System (auto)",
      passportNumber: sub.passportNumber,
    });

    await terminateMsisdnWithProvider(msisdn);

    await tx.subscriber.update({
      where: { id: subscriberId },
      data: { status: "deregistered", simInventoryId: null, msisdnId: null },
    });

    auditLogger.info("Auto-deregister complete", {
      subscriberId,
      msisdn,
      reason: "visa_expired_deregistered",
      operator: "System (auto)",
      passportNumber: sub.passportNumber,
    });

    await tx.suspension.deleteMany({ where: { subscriberId } });
    await tx.deregistration.create({
      data: { subscriberId, reason: "visa_expired_deregistered", operator: "System (auto)" },
    });

    const msisdnRecord = sub.msisdnPool[0];
    if (msisdnRecord) {
      await tx.msisdnPool.update({
        where: { id: msisdnRecord.id },
        data: {
          status: "held",
          assignedSubscriberId: null,
          simInventoryId: null,
          reservedBy: null,
          reservedAt: null,
          reservationExpiresAt: null,
        },
      });
    }

    if (sub.simInventory) {
      await tx.simInventory.update({
        where: { id: sub.simInventory.id },
        data: {
          status: "deactivated",
          reservedBy: null,
          reservedAt: null,
          reservationExpiresAt: null,
          provisionedAt: null,
          providerConfirmationRef: null,
        },
      });
    }

    emitSubscriberDeregistered(sub);
    return sub;
  });
}
