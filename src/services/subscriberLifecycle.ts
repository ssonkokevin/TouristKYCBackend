import { prisma } from "../lib/prisma.js";
import { emitSubscriberDeregistered } from "../sockets/index.js";

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

    await tx.subscriber.update({ where: { id: subscriberId }, data: { status: "suspended" } });

    await tx.suspension.create({
      data: { subscriberId, reason, reasonNote, suspendedBy },
    });

    const msisdn = sub.msisdnPool[0];
    if (msisdn) {
      await tx.msisdnPool.update({ where: { id: msisdn.id }, data: { status: "suspended" } });
    }
    if (sub.simInventory) {
      await tx.simInventory.update({ where: { id: sub.simInventory.id }, data: { status: "suspended" } });
    }

    return sub;
  });
}

export async function reactivateSubscriber(subscriberId: string) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscriber.findUnique({
      where: { id: subscriberId },
      include: { simInventory: true, msisdnPool: { take: 1 } },
    });
    if (!sub) throw new Error("Subscriber not found");

    await tx.subscriber.update({ where: { id: subscriberId }, data: { status: "active" } });
    await tx.suspension.deleteMany({ where: { subscriberId } });

    const msisdn = sub.msisdnPool[0];
    if (msisdn) {
      await tx.msisdnPool.update({ where: { id: msisdn.id }, data: { status: "active" } });
    }
    if (sub.simInventory) {
      await tx.simInventory.update({ where: { id: sub.simInventory.id }, data: { status: "active" } });
    }

    return sub;
  });
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

    await tx.subscriber.update({
      where: { id: subscriberId },
      data: { status: "deregistered", simInventoryId: null, msisdnId: null },
    });

    await tx.suspension.deleteMany({ where: { subscriberId } });
    await tx.deregistration.create({ data: { subscriberId, reason, reasonNote, operator } });

    const msisdn = sub.msisdnPool[0];
    if (msisdn) {
      await tx.msisdnPool.update({
        where: { id: msisdn.id },
        data: {
          status: "available",
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

    await tx.subscriber.update({
      where: { id: subscriberId },
      data: { status: "deregistered", simInventoryId: null, msisdnId: null },
    });

    await tx.suspension.deleteMany({ where: { subscriberId } });
    await tx.deregistration.create({
      data: { subscriberId, reason: "visa_expired_deregistered", operator: "System (auto)" },
    });

    const msisdn = sub.msisdnPool[0];
    if (msisdn) {
      await tx.msisdnPool.update({
        where: { id: msisdn.id },
        data: {
          status: "available",
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
