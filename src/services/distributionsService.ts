import { prisma } from "../lib/prisma.js";

export async function getNationalityDistribution() {
  const rows = await prisma.subscriber.groupBy({
    by: ["nationalityCode"],
    where: { status: { in: ["active", "suspended"] } },
    _count: { nationalityCode: true },
    orderBy: { _count: { nationalityCode: "desc" } },
  });

  const codes = rows.map((r) => r.nationalityCode);
  const nationalities = await prisma.nationality.findMany({
    where: { code: { in: codes } },
    select: { code: true, name: true, flagEmoji: true },
  });

  return rows.map((r) => ({
    code: r.nationalityCode,
    name: nationalities.find((n) => n.code === r.nationalityCode)?.name || r.nationalityCode,
    flagEmoji: nationalities.find((n) => n.code === r.nationalityCode)?.flagEmoji ?? "🏳️",
    count: r._count.nationalityCode,
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

export async function getStatusDistribution() {
  const rows = await prisma.subscriber.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return rows.map((r) => ({
    status: r.status,
    count: r._count.status,
  }));
}
