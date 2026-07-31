import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emitSubscriberRegistered } from "../sockets/index.js";
import { queueSyncProviderAssignment } from "../jobs/queue.js";

function mapSnakeToCamel(data: any) {
  return {
    surname: data.surname,
    otherNames: data.other_names,
    gender: data.gender,
    dateOfBirth: data.date_of_birth,
    nationalityCode: data.nationality_code,
    idType: data.id_type,
    passportNumber: data.passport_number,
    passportIssueDate: data.passport_issue_date,
    passportExpiry: data.passport_expiry,
    visaType: data.visa_type,
    visaNumber: data.visa_number,
    visaIssueDate: data.visa_issue_date,
    visaExpiryDate: data.visa_expiry_date,
    purposeOfVisit: data.purpose_of_visit,
    entryPoint: data.entry_point,
    arrivalDate: data.arrival_date,
    intendedDurationDays: data.intended_duration_days,
    accommodation: data.accommodation,
    registeredAt: data.date_of_registration,
    registrationType: data.registration_type,
    registeredBy: data.registered_by,
    registrationBooth: data.registration_booth,
    agentId: data.agent_id,
    agentNumber: data.agent_number,
    agentName: data.agent_name,
    subscriberPhotoUrl: data.subscriber_photo_url,
    passportBioPageUrl: data.passport_bio_page_url,
    visaPageUrl: data.visa_page_url,
    applicationFormUrl: data.application_form_url,
  };
}

const resourceInclude = {
  nationality: true,
  simInventory: true,
  msisdnPool: { take: 1 },
} as const;

export async function createSubscriber(input: any) {
  const { sim_inventory_id, msisdn_id, iccid, msisdn, ...data } = input;

  let resolvedSimId: string | undefined = sim_inventory_id;
  let resolvedMsisdnId: string | undefined = msisdn_id;

  if (iccid || msisdn) {
    const [sim, msisdnRecord] = await Promise.all([
      iccid ? prisma.simInventory.findUnique({ where: { iccid } }) : null,
      msisdn ? prisma.msisdnPool.findUnique({ where: { msisdn } }) : null,
    ]);

    if (iccid && !sim) {
      const error = new Error("SIM not found for provided ICCID");
      (error as any).statusCode = 404;
      throw error;
    }
    if (msisdn && !msisdnRecord) {
      const error = new Error("MSISDN not found for provided MSISDN");
      (error as any).statusCode = 404;
      throw error;
    }

    if (sim) resolvedSimId = sim.id;
    if (msisdnRecord) resolvedMsisdnId = msisdnRecord.id;
  }

  if (!resolvedSimId || !resolvedMsisdnId) {
    const error = new Error("sim_inventory_id + msisdn_id or iccid + msisdn are required");
    (error as any).statusCode = 400;
    throw error;
  }

  // Idempotency: if this exact resource pair is already registered, return the existing record.
  const existing = await prisma.subscriber.findFirst({
    where: { simInventoryId: resolvedSimId, msisdnId: resolvedMsisdnId },
    include: resourceInclude,
  });
  if (existing) {
    return {
      ...existing,
      provider_sync_status: "already_registered",
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    // Race-safe assignment: transition resources from available or provisioned to assigned.
    const [simUpdate, msisdnUpdate] = await Promise.all([
      tx.simInventory.updateMany({
        where: { id: resolvedSimId, status: { in: ["available", "provisioned"] } },
        data: { status: "assigned" },
      }),
      tx.msisdnPool.updateMany({
        where: { id: resolvedMsisdnId, status: { in: ["available", "provisioned"] } },
        data: { status: "assigned", simInventoryId: resolvedSimId },
      }),
    ]);

    if (simUpdate.count === 0 || msisdnUpdate.count === 0) {
      // The pair may have just been assigned by a duplicate request; re-check.
      const raceExisting = await tx.subscriber.findFirst({
        where: { simInventoryId: resolvedSimId, msisdnId: resolvedMsisdnId },
        include: resourceInclude,
      });
      if (raceExisting) return raceExisting;

      const error = new Error("SIM or MSISDN not available or already assigned");
      (error as any).statusCode = 409;
      throw error;
    }

    const sub = await tx.subscriber.create({
      data: {
        ...mapSnakeToCamel(data),
        simInventoryId: resolvedSimId,
        msisdnId: resolvedMsisdnId,
        status: "active",
      },
      include: resourceInclude,
    });

    await tx.msisdnPool.update({
      where: { id: resolvedMsisdnId },
      data: { assignedSubscriberId: sub.id },
    });

    return sub;
  });

  // Refetch so the msisdnPool relation reflects the assignedSubscriberId update.
  const subscriber = await prisma.subscriber.findUniqueOrThrow({
    where: { id: created.id },
    include: resourceInclude,
  });

  emitSubscriberRegistered(subscriber);

  // Queue async outbound provider notification
  await queueSyncProviderAssignment({
    subscriberId: subscriber.id,
    simInventoryId: resolvedSimId,
    msisdnId: resolvedMsisdnId,
  });

  return {
    ...subscriber,
    provider_sync_status: "queued",
  };
}

export async function listSubscribers(filters: {
  page: number;
  limit: number;
  status?: string;
  nationality?: string;
  visa_expiry_from?: Date;
  visa_expiry_to?: Date;
  registered_from?: Date;
  registered_to?: Date;
  surname?: string;
  other_names?: string;
  name?: string;
  passport_number?: string;
  msisdn?: string;
}) {
  const where: Prisma.SubscriberWhereInput = {};
  if (filters.status) where.status = filters.status as any;
  if (filters.nationality) where.nationalityCode = filters.nationality;
  if (filters.visa_expiry_from || filters.visa_expiry_to) {
    where.visaExpiryDate = {};
    if (filters.visa_expiry_from) where.visaExpiryDate.gte = filters.visa_expiry_from;
    if (filters.visa_expiry_to) where.visaExpiryDate.lte = filters.visa_expiry_to;
  }
  if (filters.registered_from || filters.registered_to) {
    where.registeredAt = {};
    if (filters.registered_from) where.registeredAt.gte = filters.registered_from;
    if (filters.registered_to) where.registeredAt.lte = filters.registered_to;
  }
  if (filters.name) {
    where.OR = [
      { surname: { contains: filters.name, mode: "insensitive" } },
      { otherNames: { contains: filters.name, mode: "insensitive" } },
    ];
  }
  if (filters.surname) where.surname = { contains: filters.surname, mode: "insensitive" };
  if (filters.other_names) where.otherNames = { contains: filters.other_names, mode: "insensitive" };
  if (filters.passport_number) where.passportNumber = { contains: filters.passport_number };
  if (filters.msisdn) {
    where.msisdnPool = { some: { msisdn: { contains: filters.msisdn } } };
  }

  const [data, total] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { registeredAt: "desc" },
      include: {
        nationality: { select: { name: true, flagEmoji: true } },
        simInventory: { select: { imsi: true, iccid: true, type: true, batchId: true } },
        msisdnPool: { take: 1, select: { msisdn: true } },
      },
    }),
    prisma.subscriber.count({ where }),
  ]);

  return { data, total, page: filters.page, limit: filters.limit };
}

export async function getSubscriber(id: string) {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id },
    include: {
      nationality: true,
      simInventory: true,
      msisdnPool: { take: 1, include: { simInventory: true } },
      suspension: true,
      deregistration: true,
      providerSyncLog: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!subscriber) {
    const error = new Error("Subscriber not found");
    (error as any).statusCode = 404;
    throw error;
  }
  return subscriber;
}

export async function updateSubscriber(id: string, input: any) {
  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber) {
    const error = new Error("Subscriber not found");
    (error as any).statusCode = 404;
    throw error;
  }

  // Prevent direct status changes via this endpoint; use lifecycle functions
  const { status, sim_inventory_id, msisdn_id, ...safeInput } = input;

  return prisma.subscriber.update({
    where: { id },
    data: safeInput,
    include: {
      nationality: true,
      simInventory: true,
      msisdnPool: { take: 1 },
    },
  });
}
