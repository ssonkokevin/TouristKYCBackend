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
  quarantined: ["available"],
};

export interface AvailableFilters {
  limit: number;
  type?: "esim" | "physical";
  category?: string;
}

export interface ProvisionInput {
  provider_id: string;
  provider_confirmation_ref: string;
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
 * Read-only listing of currently available SIMs (ICCID + IMSI pairs).
 * Does not mutate any state — safe to call repeatedly / concurrently.
 */
export async function listAvailableSimInventory(filters: AvailableFilters) {
  const { limit, type, category } = filters;
  const typeCond = type ? Prisma.sql`AND type = ${type}` : Prisma.sql``;
  const categoryCond = category ? Prisma.sql`AND category = ${category}` : Prisma.sql``;

  const query = Prisma.sql`
    SELECT id, imsi, iccid, type, category
    FROM sim_inventory
    WHERE status = 'available'
      ${typeCond}
      ${categoryCond}
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;
  const items = await prisma.$queryRaw<Array<{ id: string; imsi: string; iccid: string; type: string; category: string }>>(query);

  return items.map((i) => ({
    resource_id: i.id,
    imsi: i.imsi,
    iccid: i.iccid,
    type: i.type,
    category: i.category,
  }));
}

/**
 * Atomically claims a specific, previously-listed SIM (by resource_id) and
 * marks it as provisioned in one step. Guards against a race where two
 * callers try to provision the same SIM: only the first `available -> provisioned`
 * update succeeds; the other receives a 409.
 */
export async function provisionSimInventory(id: string, input: ProvisionInput) {
  const { provider_id, provider_confirmation_ref, provisioned_at } = input;

  const result = await prisma.simInventory.updateMany({
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
    return prisma.simInventory.findUnique({ where: { id } });
  }

  const existing = await prisma.simInventory.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error("SIM not found");
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

  const error = new Error(`SIM is not available (current status: ${existing.status})`);
  (error as any).statusCode = 409;
  throw error;
}

export async function assignSimInventoryToSubscriber(id: string, subscriberId: string) {
  const item = await prisma.simInventory.findUnique({ where: { id } });
  if (!item) {
    const error = new Error("SIM not found");
    (error as any).statusCode = 404;
    throw error;
  }
  assertTransition(item.status, "assigned");

  return prisma.$transaction(async (tx) => {
    await tx.simInventory.update({ where: { id }, data: { status: "assigned" } });
    await tx.subscriber.update({ where: { id: subscriberId }, data: { simInventoryId: id } });
  });
}

export async function activateSimInventory(id: string) {
  const item = await prisma.simInventory.findUnique({ where: { id } });
  if (!item) {
    const error = new Error("SIM not found");
    (error as any).statusCode = 404;
    throw error;
  }
  assertTransition(item.status, "active");
  return prisma.simInventory.update({ where: { id }, data: { status: "active" } });
}

export async function releaseSimInventory(id: string) {
  const item = await prisma.simInventory.findUnique({
    where: { id },
    include: { subscriber: { select: { id: true } } },
  });

  if (!item) {
    const error = new Error("SIM not found");
    (error as any).statusCode = 404;
    throw error;
  }
  if (item.subscriber) {
    const error = new Error("Cannot release a SIM already assigned to a subscriber");
    (error as any).statusCode = 409;
    throw error;
  }
  if (item.status !== "provisioned" && item.status !== "reserved") {
    const error = new Error(`Cannot release SIM from status '${item.status}'`);
    (error as any).statusCode = 409;
    throw error;
  }

  return prisma.simInventory.update({
    where: { id },
    data: {
      status: "available",
      reservedBy: null,
      reservedAt: null,
      reservationExpiresAt: null,
      provisionedAt: null,
      providerConfirmationRef: null,
    },
  });
}

export async function listSimInventory(filters: {
  page: number;
  limit: number;
  status?: string;
  batch_id?: string;
  type?: "esim" | "physical";
  category?: string;
  imsi?: string;
  iccid?: string;
  msisdn?: string;
}) {
  const { page, limit, status, batch_id, type, category, imsi, iccid, msisdn } = filters;
  const where: Prisma.SimInventoryWhereInput = {};
  if (status) where.status = status as any;
  if (batch_id) where.batchId = batch_id;
  if (type) where.type = type;
  if (category) where.category = category;
  if (imsi) where.imsi = { contains: imsi };
  if (iccid) where.iccid = { contains: iccid };
  if (msisdn) where.msisdnPool = { msisdn: { contains: msisdn } };

  const [data, total] = await Promise.all([
    prisma.simInventory.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        subscriber: { select: { id: true, surname: true, otherNames: true } },
        msisdnPool: { select: { msisdn: true } },
      },
    }),
    prisma.simInventory.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getSimInventory(id: string) {
  const item = await prisma.simInventory.findUnique({
    where: { id },
    include: {
      subscriber: { select: { id: true, surname: true, otherNames: true, status: true } },
      msisdnPool: true,
      providerSyncLog: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!item) {
    const error = new Error("SIM not found");
    (error as any).statusCode = 404;
    throw error;
  }
  return item;
}

export async function lookupSimByIdentifier(filters: { imsi?: string; iccid?: string }) {
  const { imsi, iccid } = filters;
  if (!imsi && !iccid) {
    const error = new Error("imsi or iccid is required");
    (error as any).statusCode = 400;
    throw error;
  }

  const item = await prisma.simInventory.findFirst({
    where: {
      OR: [
        imsi ? { imsi } : undefined,
        iccid ? { iccid } : undefined,
      ].filter(Boolean) as Prisma.SimInventoryWhereInput[],
    },
    include: {
      msisdnPool: { select: { msisdn: true, status: true } },
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

export async function getSimInventorySummary() {
  const summary = await prisma.simInventory.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const typeSummary = await prisma.simInventory.groupBy({
    by: ["type"],
    _count: { type: true },
  });
  return { status: summary, type: typeSummary };
}

export async function importSimInventory(input: any) {
  // Placeholder: accepts an array of { imsi, iccid, type, category, batchId }
  const items = Array.isArray(input) ? input : input.rows;
  if (!Array.isArray(items)) {
    const error = new Error("Expected array of items");
    (error as any).statusCode = 400;
    throw error;
  }
  const created = await prisma.simInventory.createMany({
    data: items.map((i: any) => ({
      imsi: i.imsi,
      iccid: i.iccid,
      type: i.type || "esim",
      category: i.category || "tourist",
      batchId: i.batchId || "imported",
      status: "available",
    })),
    skipDuplicates: true,
  });
  return { imported: created.count };
}

export async function releaseExpiredReservations() {
  const expired = await prisma.simInventory.findMany({
    where: {
      status: "reserved",
      reservationExpiresAt: { lt: new Date() },
    },
  });

  await prisma.simInventory.updateMany({
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

  const result = await prisma.simInventory.updateMany({
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
      provisionedAt: null,
      providerConfirmationRef: null,
    },
  });

  return { released: result.count };
}
