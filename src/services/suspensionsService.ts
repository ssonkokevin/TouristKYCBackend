import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { reactivateSubscriber } from "./subscriberLifecycle.js";

export async function listSuspensions(filters: {
  page: number;
  limit: number;
  name?: string;
  msisdn?: string;
  reason?: string;
  suspended_from?: Date;
  suspended_to?: Date;
}) {
  const where: Prisma.SuspensionWhereInput = {};
  if (filters.reason) where.reason = filters.reason as any;
  if (filters.suspended_from || filters.suspended_to) {
    where.suspendedAt = {};
    if (filters.suspended_from) where.suspendedAt.gte = filters.suspended_from;
    if (filters.suspended_to) where.suspendedAt.lte = filters.suspended_to;
  }
  if (filters.name) {
    where.subscriber = {
      OR: [
        { surname: { contains: filters.name, mode: "insensitive" } },
        { otherNames: { contains: filters.name, mode: "insensitive" } },
      ],
    };
  }
  if (filters.msisdn) {
    where.subscriber = {
      ...(where.subscriber as any),
      msisdnPool: { some: { msisdn: { contains: filters.msisdn } } },
    };
  }

  const [data, total] = await Promise.all([
    prisma.suspension.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { suspendedAt: "desc" },
      include: {
        subscriber: {
          include: {
            nationality: { select: { name: true, flagEmoji: true } },
            msisdnPool: { take: 1, select: { msisdn: true } },
            simInventory: { select: { imsi: true, iccid: true } },
          },
        },
      },
    }),
    prisma.suspension.count({ where }),
  ]);

  return { data, total, page: filters.page, limit: filters.limit };
}

export async function reactivate(id: string) {
  return reactivateSubscriber(id);
}
