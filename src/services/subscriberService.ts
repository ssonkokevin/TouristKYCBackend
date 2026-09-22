import { Prisma, DocumentType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emitSubscriberRegistered } from "../sockets/index.js";
import { queueSyncProviderAssignment } from "../jobs/queue.js";
import { config } from "../config.js";

function mapSnakeToCamel(data: any) {
  return {
    surname: data.surname,
    otherNames: data.other_names,
    gender: data.gender,
    dateOfBirth: data.date_of_birth,
    nationalityCode: data.nationality_code,
    idType: data.id_type ?? "passport",
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
    registrationType: data.registration_type ?? "foreigner",
    registeredBy: data.registered_by,
    registrationBooth: data.registration_booth,
    agentId: data.agent_id,
    agentNumber: data.agent_number,
    agentName: data.agent_name,
  };
}

const documentTypeFields: Record<string, DocumentType> = {
  subscriber_photo_url: "subscriber_photo",
  passport_bio_page_url: "passport_bio_page",
  visa_page_url: "visa_page",
  application_form_url: "application_form",
};

// Inline base64 (data URI) fields, one per document type — the path used by
// the external system to push image bytes directly instead of a pre-hosted
// URL. Field names deliberately mirror documentTypeFields minus the _url
// suffix.
const inlineImageFields: Record<string, DocumentType> = {
  subscriber_photo: "subscriber_photo",
  passport_bio_page: "passport_bio_page",
  visa_page: "visa_page",
  application_form: "application_form",
};

const DATA_URI_RE = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/;

function buildDocumentCreates(subscriberId: string, data: any) {
  const docs: {
    subscriberId: string;
    type: DocumentType;
    url?: string;
    imageData?: Buffer;
    mimeType?: string;
  }[] = [];

  for (const [field, type] of Object.entries(inlineImageFields)) {
    const dataUri = data[field];
    if (dataUri) {
      const match = DATA_URI_RE.exec(dataUri);
      if (!match) {
        const error = new Error(`${field} must be a base64 data URI (data:<mime-type>;base64,<data>)`);
        (error as any).statusCode = 400;
        throw error;
      }
      const [, mimeType, base64Payload] = match;
      docs.push({ subscriberId, type, imageData: Buffer.from(base64Payload, "base64"), mimeType });
    }
  }

  const inlineTypes = new Set(docs.map((d) => d.type));
  for (const [field, type] of Object.entries(documentTypeFields)) {
    if (inlineTypes.has(type)) continue; // inline image already provided for this type, it wins
    const url = data[field];
    if (url) {
      docs.push({ subscriberId, type, url });
    }
  }

  return docs;
}

function serializeDocuments(
  documents:
    | { type: DocumentType; url: string | null; imageData: Buffer | null; mimeType: string | null; uploadedAt: Date }[]
    | undefined
    | null,
  subscriberId?: string
) {
  if (!documents || documents.length === 0) return undefined;
  const result: Record<string, { url: string | null; uploadedAt: string }> = {};
  for (const doc of documents) {
    const url = doc.imageData
      ? `${(config.PUBLIC_BASE_URL || "").replace(/\/$/, "")}/api/v1/documents/subscribers/${subscriberId}/${doc.type}/raw`
      : doc.url;
    result[doc.type] = { url, uploadedAt: doc.uploadedAt.toISOString() };
  }
  return result;
}

function serializeSubscriber(subscriber: any, providerSyncStatus?: string) {
  return {
    ...subscriber,
    documents: serializeDocuments(subscriber.documents, subscriber.id),
    provider_sync_status: providerSyncStatus,
  };
}

const resourceInclude = {
  nationality: true,
  simInventory: true,
  msisdnPool: { take: 1 },
  documents: true,
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
    return serializeSubscriber(existing, "already_registered");
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

    const docs = buildDocumentCreates(sub.id, data);
    if (docs.length > 0) {
      await tx.subscriberDocument.createMany({ data: docs });
    }

    await tx.msisdnPool.update({
      where: { id: resolvedMsisdnId },
      data: { assignedSubscriberId: sub.id },
    });

    // Refetch to include the newly created documents
    const fullSub = await tx.subscriber.findUniqueOrThrow({
      where: { id: sub.id },
      include: resourceInclude,
    });

    return fullSub;
  });

  // Refetch so the msisdnPool relation reflects the assignedSubscriberId update.
  const subscriber = await prisma.subscriber.findUniqueOrThrow({
    where: { id: created.id },
    include: resourceInclude,
  });

  const serialized = serializeSubscriber(subscriber);

  emitSubscriberRegistered(serialized);

  // Queue async outbound provider notification
  await queueSyncProviderAssignment({
    subscriberId: subscriber.id,
    simInventoryId: resolvedSimId,
    msisdnId: resolvedMsisdnId,
  });

  return serializeSubscriber(subscriber, "queued");
}

export interface SubscriberListFilters {
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
}

/**
 * Shared filter construction used by both the paginated list endpoint and
 * the (unpaginated) CSV export stream, so the two can never drift apart on
 * what "the current filtered range" means.
 */
export function buildSubscriberWhere(filters: SubscriberListFilters): Prisma.SubscriberWhereInput {
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
  return where;
}

// Shared `include` shape for both the list endpoint and the CSV export
// stream — carries the suspension/deregistration timestamps needed to fold
// "Suspended · {date}" / "Deregistered · {date}" into a single status pill,
// on top of the existing nationality/SIM/MSISDN relations.
const listInclude = {
  nationality: { select: { name: true, flagEmoji: true } },
  simInventory: { select: { imsi: true, iccid: true, type: true, batchId: true } },
  msisdnPool: { take: 1 as const, select: { msisdn: true } },
  documents: true,
  suspension: { select: { suspendedAt: true } },
  deregistration: { select: { deregisteredAt: true } },
} satisfies Prisma.SubscriberInclude;

export async function listSubscribers(
  filters: SubscriberListFilters & {
    page: number;
    limit: number;
    sort_by?: "registeredAt" | "visaExpiryDate";
    sort_dir?: "asc" | "desc";
  }
) {
  const where = buildSubscriberWhere(filters);

  const [data, total] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { [filters.sort_by ?? "registeredAt"]: filters.sort_dir ?? "desc" },
      include: listInclude,
    }),
    prisma.subscriber.count({ where }),
  ]);

  return {
    data: data.map((s) => serializeSubscriber(s)),
    total,
    page: filters.page,
    limit: filters.limit,
  };
}

const EXPORT_BATCH_SIZE = 500;

/**
 * Async generator over every subscriber matching `filters`, in fixed-size
 * batches, for the CSV export stream — deliberately bypasses the 5000-row
 * page cap the paginated list endpoint enforces, since export needs to
 * reflect every matching row for compliance, but never materializes the
 * whole result set in memory at once.
 */
export async function* iterateSubscribersForExport(filters: SubscriberListFilters) {
  const where = buildSubscriberWhere(filters);
  let skip = 0;
  for (;;) {
    const batch = await prisma.subscriber.findMany({
      where,
      skip,
      take: EXPORT_BATCH_SIZE,
      orderBy: { registeredAt: "desc" },
      include: listInclude,
    });
    if (batch.length === 0) return;
    for (const row of batch) yield row;
    if (batch.length < EXPORT_BATCH_SIZE) return;
    skip += EXPORT_BATCH_SIZE;
  }
}

export async function getSubscriber(id: string) {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id },
    include: {
      nationality: true,
      simInventory: true,
      msisdnPool: { take: 1, include: { simInventory: true } },
      documents: true,
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
  return serializeSubscriber(subscriber);
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

  const updated = await prisma.subscriber.update({
    where: { id },
    data: safeInput,
    include: {
      nationality: true,
      simInventory: true,
      msisdnPool: { take: 1 },
      documents: true,
    },
  });

  return serializeSubscriber(updated);
}
