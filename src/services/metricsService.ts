import { prisma } from "../lib/prisma.js";

export async function getMetrics() {
  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const [
    totalTourists,
    activeSubscribers,
    suspended,
    deregistered,
    simStockAvailable,
    simStockAssigned,
    expiringSoon,
    visaExpiredActive,
  ] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { status: "active" } }),
    prisma.subscriber.count({ where: { status: "suspended" } }),
    prisma.subscriber.count({ where: { status: "deregistered" } }),
    prisma.msisdnPool.count({ where: { status: "available" } }),
    prisma.msisdnPool.count({ where: { status: { in: ["assigned", "active"] } } }),
    prisma.subscriber.count({
      where: { status: "active", visaExpiryDate: { gte: now, lte: in7Days } },
    }),
    prisma.subscriber.count({
      where: { status: "active", visaExpiryDate: { lte: now } },
    }),
  ]);

  return {
    total_tourists: totalTourists,
    active_sims: activeSubscribers,
    suspended,
    deregistered,
    sim_stock_available: simStockAvailable,
    sim_stock_assigned: simStockAssigned,
    expiring_soon: expiringSoon,
    visa_expired_active: visaExpiredActive,
  };
}
