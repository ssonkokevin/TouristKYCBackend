import { prisma } from "../lib/prisma.js";

const SIM_LIMIT = 10;

export async function getPassportHistory(passportNumber: string) {
  const records = await prisma.subscriber.findMany({
    where: { passportNumber },
    orderBy: { registeredAt: "desc" },
    include: {
      msisdnPool: { take: 1, select: { msisdn: true } },
      simInventory: { select: { iccid: true } },
    },
  });

  const total = records.length;

  return {
    passport_number: passportNumber,
    total_sims_registered: total,
    limit: SIM_LIMIT,
    remaining: Math.max(0, SIM_LIMIT - total),
    at_limit: total >= SIM_LIMIT,
    records: records.map((r) => ({
      subscriber_id: r.id,
      name: `${r.otherNames} ${r.surname}`.trim(),
      msisdn: r.msisdnPool[0]?.msisdn,
      iccid: r.simInventory?.iccid,
      status: r.status,
      registered_at: r.registeredAt,
      registration_booth: r.registrationBooth,
    })),
  };
}
