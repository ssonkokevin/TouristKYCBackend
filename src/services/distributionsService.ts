import { prisma } from "../lib/prisma.js";

export async function getNationalityDistribution(from?: Date, to?: Date) {
  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  // When a range is given (header date-range picker), every count below is
  // scoped to registrations within that range instead of all-time — the
  // "active"/"suspended"/"expiring soon" breakdowns still reflect *current*
  // status (status is a live attribute, not something that happened "in"
  // the range), but only for subscribers who registered within it.
  const registeredInRange: { gte?: Date; lte?: Date } | undefined =
    from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;

  const [rows, activeRows, suspendedRows, expiringRows, recentRows] = await Promise.all([
    prisma.subscriber.groupBy({
      by: ["nationalityCode"],
      where: registeredInRange ? { registeredAt: registeredInRange } : undefined,
      _count: { nationalityCode: true },
      orderBy: { _count: { nationalityCode: "desc" } },
    }),
    prisma.subscriber.groupBy({
      by: ["nationalityCode"],
      where: { status: "active", ...(registeredInRange ? { registeredAt: registeredInRange } : {}) },
      _count: { nationalityCode: true },
    }),
    prisma.subscriber.groupBy({
      by: ["nationalityCode"],
      where: { status: "suspended", ...(registeredInRange ? { registeredAt: registeredInRange } : {}) },
      _count: { nationalityCode: true },
    }),
    prisma.subscriber.groupBy({
      by: ["nationalityCode"],
      where: {
        status: "active",
        visaExpiryDate: { gte: now, lte: in7Days },
        ...(registeredInRange ? { registeredAt: registeredInRange } : {}),
      },
      _count: { nationalityCode: true },
    }),
    prisma.subscriber.groupBy({
      by: ["nationalityCode"],
      where: { registeredAt: registeredInRange ?? { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      _count: { nationalityCode: true },
    }),
  ]);

  const activeByCode = new Map(activeRows.map((r) => [r.nationalityCode, r._count.nationalityCode]));
  const suspendedByCode = new Map(suspendedRows.map((r) => [r.nationalityCode, r._count.nationalityCode]));
  const expiringByCode = new Map(expiringRows.map((r) => [r.nationalityCode, r._count.nationalityCode]));
  const recentByCode = new Map(recentRows.map((r) => [r.nationalityCode, r._count.nationalityCode]));

  const codes = rows.map((r) => r.nationalityCode);
  const nationalities = await prisma.nationality.findMany({
    where: { code: { in: codes } },
    select: { code: true, code3: true, name: true, flagEmoji: true },
  });

  return rows.map((r) => ({
    code: r.nationalityCode,
    code3: nationalities.find((n) => n.code === r.nationalityCode)?.code3 ?? null,
    name: nationalities.find((n) => n.code === r.nationalityCode)?.name || r.nationalityCode,
    flagEmoji: nationalities.find((n) => n.code === r.nationalityCode)?.flagEmoji ?? "🏳️",
    count: r._count.nationalityCode,
    activeCount: activeByCode.get(r.nationalityCode) ?? 0,
    suspendedCount: suspendedByCode.get(r.nationalityCode) ?? 0,
    expiringSoonCount: expiringByCode.get(r.nationalityCode) ?? 0,
    recentCount: recentByCode.get(r.nationalityCode) ?? 0,
  }));
}

export async function getPurposeDistribution() {
  const rows = await prisma.subscriber.groupBy({
    by: ["purposeOfVisit"],
    where: { status: { in: ["active", "suspended"] } },
    _count: { purposeOfVisit: true },
  });

  return rows.map((r) => ({
    purposeOfVisit: r.purposeOfVisit,
    count: r._count.purposeOfVisit,
  }));
}

export async function getStatusDistribution(from?: Date, to?: Date) {
  const where: any = {};
  if (from || to) {
    where.registeredAt = {};
    if (from) where.registeredAt.gte = from;
    if (to) where.registeredAt.lte = to;
  }

  const rows = await prisma.subscriber.groupBy({
    by: ["status"],
    where,
    _count: { status: true },
  });

  return rows.map((r) => ({
    status: r.status,
    count: r._count.status,
  }));
}
