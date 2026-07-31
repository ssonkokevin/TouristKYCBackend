import { prisma } from "../lib/prisma.js";

export async function getByVisaType(from?: Date, to?: Date) {
  const where: any = {};
  if (from || to) {
    where.registeredAt = {};
    if (from) where.registeredAt.gte = from;
    if (to) where.registeredAt.lte = to;
  }

  const rows = await prisma.subscriber.groupBy({
    by: ["visaType"],
    where,
    _count: { visaType: true },
    orderBy: { _count: { visaType: "desc" } },
  });

  return rows
    .filter((r) => r.visaType)
    .map((r) => ({ label: r.visaType, count: r._count.visaType }));
}

export async function getByPurpose(from?: Date, to?: Date) {
  const where: any = {};
  if (from || to) {
    where.registeredAt = {};
    if (from) where.registeredAt.gte = from;
    if (to) where.registeredAt.lte = to;
  }

  const rows = await prisma.subscriber.groupBy({
    by: ["purposeOfVisit"],
    where,
    _count: { purposeOfVisit: true },
    orderBy: { _count: { purposeOfVisit: "desc" } },
  });

  return rows
    .filter((r) => r.purposeOfVisit)
    .map((r) => ({ label: r.purposeOfVisit, count: r._count.purposeOfVisit }));
}

export async function getByNationality(from?: Date, to?: Date) {
  const where: any = {};
  if (from || to) {
    where.registeredAt = {};
    if (from) where.registeredAt.gte = from;
    if (to) where.registeredAt.lte = to;
  }

  const rows = await prisma.subscriber.groupBy({
    by: ["nationalityCode"],
    where,
    _count: { nationalityCode: true },
    orderBy: { _count: { nationalityCode: "desc" } },
  });

  const codes = rows.map((r) => r.nationalityCode);
  const nationalities = await prisma.nationality.findMany({
    where: { code: { in: codes } },
    select: { code: true, name: true },
  });

  return rows.map((r) => ({
    code: r.nationalityCode,
    label: nationalities.find((n) => n.code === r.nationalityCode)?.name || r.nationalityCode,
    count: r._count.nationalityCode,
  }));
}
