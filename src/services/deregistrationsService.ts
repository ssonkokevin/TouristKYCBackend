import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function listDeregistrations(filters: {
  page: number;
  limit: number;
  name?: string;
  msisdn?: string;
  reason?: string;
  deregistered_from?: Date;
  deregistered_to?: Date;
}) {
  const where: Prisma.DeregistrationWhereInput = {};
  if (filters.reason) where.reason = filters.reason as any;
  if (filters.deregistered_from || filters.deregistered_to) {
    where.deregisteredAt = {};
    if (filters.deregistered_from) where.deregisteredAt.gte = filters.deregistered_from;
    if (filters.deregistered_to) where.deregisteredAt.lte = filters.deregistered_to;
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
    prisma.deregistration.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { deregisteredAt: "desc" },
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
    prisma.deregistration.count({ where }),
  ]);

  return { data, total, page: filters.page, limit: filters.limit };
}
