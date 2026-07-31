import { prisma } from "../lib/prisma.js";
import { emitNotification } from "../sockets/index.js";

export async function listNotifications(filters: { unread?: string; limit: number }) {
  const where: any = {};
  if (filters.unread === "true") where.isRead = false;

  const notifications = await prisma.notification.findMany({
    where,
    take: filters.limit,
    orderBy: { createdAt: "desc" },
    include: { subscriber: { select: { surname: true, otherNames: true } } },
  });

  return notifications;
}

export async function markRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function createNotification(input: {
  type: "visa_expiring_soon" | "visa_expired_suspended" | "provider_sync_failed" | "sim_pool_low";
  subscriberId?: string;
  title: string;
  body?: string;
}) {
  const notification = await prisma.notification.create({
    data: input,
    include: { subscriber: { select: { id: true, surname: true, otherNames: true } } },
  });
  emitNotification(notification);
  return notification;
}
