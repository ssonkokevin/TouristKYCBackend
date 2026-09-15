import { prisma } from "../lib/prisma.js";
import moment from "moment";

export async function getVisaExpiryAlerts(range: "7d" | "1m" | "6m" | "1y") {
  const today = moment().startOf("day");
  let buckets: { label: string; start: Date; end: Date }[] = [];
  let format: string;

  if (range === "7d") {
    for (let i = 0; i < 7; i++) {
      const d = today.clone().add(i, "days");
      buckets.push({ label: d.format("ddd"), start: d.toDate(), end: d.clone().endOf("day").toDate() });
    }
    format = "7d";
  } else if (range === "1m") {
    for (let i = 0; i < 4; i++) {
      const start = today.clone().add(i * 7, "days");
      const end = start.clone().add(6, "days").endOf("day");
      buckets.push({ label: `Week ${i + 1}`, start: start.toDate(), end: end.toDate() });
    }
    format = "1m";
  } else {
    const months = range === "6m" ? 6 : 12;
    for (let i = 0; i < months; i++) {
      const start = today.clone().add(i, "months");
      const end = start.clone().endOf("month");
      buckets.push({ label: start.format("MMM"), start: start.toDate(), end: end.toDate() });
    }
    format = range;
  }

  const data = await Promise.all(
    buckets.map(async (b) => {
      const expiring = await prisma.subscriber.count({
        where: {
          visaExpiryDate: { gte: b.start, lte: b.end },
          status: { in: ["active", "suspended"] },
        },
      });
      const active = await prisma.subscriber.count({
        where: {
          visaExpiryDate: { gt: b.end },
          status: "active",
        },
      });
      return { label: b.label, expiring, active };
    })
  );

  return { range: format, data };
}

/**
 * Day-by-day registration counts. Either pass `days` (bucketed backward from
 * today — the dashboard's fixed 365-day fetch that gets sliced client-side
 * for the 7D/30D/90D/1Y toggle), or an explicit `{ from, to }` range (used by
 * the header date-range picker and Reports, which may not end today).
 */
export async function getRegistrationTrend(opts: number | { from: Date; to: Date }) {
  const start = typeof opts === "number" ? moment().subtract(opts - 1, "days").startOf("day") : moment(opts.from).startOf("day");
  const end = typeof opts === "number" ? moment().endOf("day") : moment(opts.to).endOf("day");
  const dayCount = Math.max(1, end.clone().startOf("day").diff(start, "days") + 1);

  const subscribers = await prisma.subscriber.findMany({
    where: { registeredAt: { gte: start.toDate(), lte: end.toDate() } },
    select: { registeredAt: true },
  });

  const map = new Map<string, number>();
  for (let i = 0; i < dayCount; i++) {
    const d = start.clone().add(i, "days").format("MMM D");
    map.set(d, 0);
  }

  for (const s of subscribers) {
    const d = moment(s.registeredAt).format("MMM D");
    map.set(d, (map.get(d) || 0) + 1);
  }

  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
}
