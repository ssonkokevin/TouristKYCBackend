import { prisma } from "../lib/prisma.js";
import moment from "moment";

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

/** Day-by-day count of SIMs provisioned (SimInventory.provisionedAt), for
 * the Reports "SIM Usage" tab. Defaults to the last 30 days when no range is
 * given, mirroring alertsService.getRegistrationTrend's bucketing shape. */
export async function getSimProvisioningTrend(from?: Date, to?: Date) {
  const start = from ? moment(from).startOf("day") : moment().subtract(29, "days").startOf("day");
  const end = to ? moment(to).endOf("day") : moment().endOf("day");
  const dayCount = Math.max(1, end.clone().startOf("day").diff(start, "days") + 1);

  const provisioned = await prisma.simInventory.findMany({
    where: { provisionedAt: { gte: start.toDate(), lte: end.toDate() } },
    select: { provisionedAt: true },
  });

  const map = new Map<string, number>();
  for (let i = 0; i < dayCount; i++) {
    map.set(start.clone().add(i, "days").format("MMM D"), 0);
  }
  for (const s of provisioned) {
    if (!s.provisionedAt) continue;
    const d = moment(s.provisionedAt).format("MMM D");
    map.set(d, (map.get(d) || 0) + 1);
  }

  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
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
