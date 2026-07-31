import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  available: ["reserved"],
  reserved: ["provisioned", "available"],
  provisioned: ["assigned", "available"],
  assigned: ["active", "available"],
  active: ["suspended", "deactivated", "available"],
  suspended: ["active", "deactivated", "available"],
  deactivated: ["available"],
};

export interface AvailableFilters {
  limit: number;
  category?: string;
}

export interface ProvisionInput {
  provider_id: string;
  provider_confirmation_ref?: string;
  provisioned_at?: Date;
}

function assertTransition(from: string, to: string) {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    const error = new Error(`Invalid transition: ${from} -> ${to}`);
    (error as any).statusCode = 409;
    throw error;
  }
}

/**
 * Read-only listing of currently available MSISDNs.
 * Does not mutate any state — safe to call repeatedly / concurrently.
 */
export async function listAvailableMsisdn(filters: AvailableFilters) {
  const { limit, category } = filters;
  const categoryCond = category ? Prisma.sql`AND category = ${category}` : Prisma.sql``;

  const query = Prisma.sql`
    SELECT id, msisdn, category
    FROM msisdn_pool
    WHERE status = 'available'
      ${categoryCond}
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;
  const items = await prisma.$queryRaw<Array<{ id: string; msisdn: string; category: string }>>(query);

  return items.map((i) => ({
    resource_id: i.id,
    msisdn: i.msisdn,
    category: i.category,
  }));
}

/**
 * Atomically claims a specific, previously-listed MSISDN (by resource_id) and
 * marks it as provisioned in one step. Guards against a race where two
 * callers try to provision the same MSISDN: only the first `available -> provisioned`
 * update succeeds; the other receives a 409.
 */
export async function provisionMsisdn(id: string, input: ProvisionInput) {
  const { provider_id, provider_confirmation_ref, provisioned_at } = input;

  const result = await prisma.msisdnPool.updateMany({
    where: { id, status: "available" },
    data: {
      status: "provisioned",
      reservedBy: provider_id,
      reservedAt: new Date(),
      provisionedAt: provisioned_at || new Date(),
      providerConfirmationRef: provider_confirmation_ref,
    },
  });

  if (result.count > 0) {
    return prisma.msisdnPool.findUnique({ where: { id } });
  }

  const existing = await prisma.msisdnPool.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error("MSISDN not found");
    (error as any).statusCode = 404;
    throw error;
  }

  // Idempotent retry: same confirmation ref on an already-provisioned resource is a no-op.
  if (
    existing.status === "provisioned" &&
    provider_confirmation_ref &&
    existing.providerConfirmationRef === provider_confirmation_ref
  ) {
    return existing;
  }

  const error = new Error(`MSISDN is not available (current status: ${existing.status})`);
  (error as any).statusCode = 409;
  throw error;
}

export async function assignMsisdnToSubscriber(id: string, subscriberId: string, simInventoryId: string) {
  const item = await prisma.msisdnPool.findUnique({ where: { id } });
  if (!item) {
    const error = new Error("MSISDN not found");
    (error as any).statusCode = 404;
    throw error;
  }
  assertTransition(item.status, "assigned");

  return prisma.msisdnPool.update({
    where: { id },
    data: {
      status: "assigned",
      assignedSubscriberId: subscriberId,
      simInventoryId,
    },
  });
}

export async function activateMsisdn(id: string) {
  const item = await prisma.msisdnPool.findUnique({ where: { id } });
  if (!item) {
    const error = new Error("MSISDN not found");
    (error as any).statusCode = 404;
    throw error;
  }
  assertTransition(item.status, "active");
  return prisma.msisdnPool.update({ where: { id }, data: { status: "active" } });
}

export async function releaseMsisdn(id: string) {
  const item = await prisma.msisdnPool.findUnique({
    where: { id },
    include: { subscriber: { select: { id: true } } },
  });

  if (!item) {
    const error = new Error("MSISDN not found");
    (error as any).statusCode = 404;
    throw error;
  }
  if (item.subscriber) {
    const error = new Error("Cannot release an MSISDN already assigned to a subscriber");
    (error as any).statusCode = 409;
    throw error;
  }
  if (item.status !== "provisioned" && item.status !== "reserved") {
    const error = new Error(`Cannot release MSISDN from status '${item.status}'`);
    (error as any).statusCode = 409;
    throw error;
  }

  return prisma.msisdnPool.update({
    where: { id },
    data: {
      status: "available",
      reservedBy: null,
      reservedAt: null,
      reservationExpiresAt: null,
      simInventoryId: null,
      assignedSubscriberId: null,
      providerConfirmationRef: null,
    },
  });
}

export async function listMsisdnPool(filters: {
  page: number;
  limit: number;
  status?: string;
  category?: string;
  msisdn?: string;
}) {
  const { page, limit, status, category, msisdn } = filters;
  const where: Prisma.MsisdnPoolWhereInput = {};
  if (status) where.status = status as any;
  if (category) where.category = category;
  if (msisdn) where.msisdn = { contains: msisdn };

  const [data, total] = await Promise.all([
    prisma.msisdnPool.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        simInventory: { select: { imsi: true, iccid: true, type: true } },
        subscriber: { select: { id: true, surname: true, otherNames: true } },
      },
    }),
    prisma.msisdnPool.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getMsisdnPool(id: string) {
  const item = await prisma.msisdnPool.findUnique({
    where: { id },
    include: {
      simInventory: true,
      subscriber: { select: { id: true, surname: true, otherNames: true, status: true } },
    },
  });
  if (!item) {
    const error = new Error("MSISDN not found");
    (error as any).statusCode = 404;
    throw error;
  }
  return item;
}

export async function lookupMsisdn(msisdn: string) {
  if (!msisdn) {
    const error = new Error("msisdn is required");
    (error as any).statusCode = 400;
    throw error;
  }

  const item = await prisma.msisdnPool.findFirst({
    where: { msisdn },
    include: {
      simInventory: { select: { imsi: true, iccid: true, type: true, status: true } },
      subscriber: { select: { id: true, surname: true, otherNames: true, status: true } },
    },
  });

  if (!item) {
    const error = new Error("Resource not found");
    (error as any).statusCode = 404;
    throw error;
  }
  return item;
}

export async function getMsisdnPoolSummary() {
  const summary = await prisma.msisdnPool.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  return { status: summary };
}

export async function importMsisdnPool(input: any) {
  const items = Array.isArray(input) ? input : input.rows;
  if (!Array.isArray(items)) {
    const error = new Error("Expected array of items");
    (error as any).statusCode = 400;
    throw error;
  }
  const created = await prisma.msisdnPool.createMany({
    data: items.map((i: any) => ({
      msisdn: i.msisdn,
      category: i.category || "tourist",
      status: "available",
    })),
    skipDuplicates: true,
  });
  return { imported: created.count };
}

export async function releaseExpiredReservations() {
  const expired = await prisma.msisdnPool.findMany({
    where: {
      status: "reserved",
      reservationExpiresAt: { lt: new Date() },
    },
  });

  await prisma.msisdnPool.updateMany({
    where: {
      status: "reserved",
      reservationExpiresAt: { lt: new Date() },
    },
    data: {
      status: "available",
      reservedBy: null,
      reservedAt: null,
      reservationExpiresAt: null,
    },
  });

  return { released: expired.length };
}

export async function releaseOrphanedProvisionedResources() {
  const thresholdMinutes = Number(process.env.RELEASE_ORPHANED_AFTER_MINUTES || 15);
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  const result = await prisma.msisdnPool.updateMany({
    where: {
      status: "provisioned",
      provisionedAt: { lt: threshold },
      subscriber: { is: null },
    },
    data: {
      status: "available",
      reservedBy: null,
      reservedAt: null,
      reservationExpiresAt: null,
      simInventoryId: null,
      assignedSubscriberId: null,
      providerConfirmationRef: null,
    },
  });

  return { released: result.count };
}
