import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notifyProviderAssignment } from "./providerClient.js";

export async function listSyncLog(filters: {
  page: number;
  limit: number;
  status?: "pending" | "success" | "failed" | "timeout";
  direction?: "inbound" | "outbound";
}) {
  const where: Prisma.ProviderSyncLogWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.direction) where.direction = filters.direction;

  const [data, total] = await Promise.all([
    prisma.providerSyncLog.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: {
        subscriber: { select: { surname: true, otherNames: true, msisdnPool: { take: 1, select: { msisdn: true } } } },
        simInventory: { select: { imsi: true, iccid: true } },
      },
    }),
    prisma.providerSyncLog.count({ where }),
  ]);

  return { data, total, page: filters.page, limit: filters.limit };
}

export async function retrySyncLog(id: string) {
  const log = await prisma.providerSyncLog.findUnique({
    where: { id },
    include: { subscriber: { include: { msisdnPool: { take: 1 } } } },
  });
  if (!log) {
    const error = new Error("Sync log not found");
    (error as any).statusCode = 404;
    throw error;
  }
  if (!log.simInventoryId || !log.subscriberId || !log.subscriber?.msisdnPool[0]?.id) {
    const error = new Error("Cannot retry sync log without resource IDs");
    (error as any).statusCode = 400;
    throw error;
  }

  await prisma.providerSyncLog.update({
    where: { id },
    data: { retryCount: { increment: 1 } },
  });

  return notifyProviderAssignment({
    subscriberId: log.subscriberId,
    simInventoryId: log.simInventoryId,
    msisdnId: log.subscriber.msisdnPool[0].id,
  });
}
