import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("../jobs/queue.js", () => ({
  syncProviderQueue: {},
  queueSyncProviderAssignment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../sockets/index.js", () => ({
  io: {},
  emitSubscriberRegistered: vi.fn(),
  emitSubscriberSuspended: vi.fn(),
  emitSubscriberDeregistered: vi.fn(),
  emitSimActivated: vi.fn(),
  emitNotification: vi.fn(),
}));

import { prisma } from "../lib/prisma.js";
import {
  listAvailableSimInventory,
  provisionSimInventory,
  releaseSimInventory,
  releaseOrphanedProvisionedResources as releaseOrphanedSims,
} from "./simInventoryService.js";
import {
  listAvailableMsisdn,
  provisionMsisdn,
  releaseMsisdn,
  releaseOrphanedProvisionedResources as releaseOrphanedMsisdns,
} from "./msisdnPoolService.js";
import { createSubscriber } from "./subscriberService.js";

const TEST_TAG = randomUUID().replace(/-/g, "").slice(0, 8);
const NATIONALITY_CODE = "ZZ";

function makeImsi(tag: string) {
  return `IM${TEST_TAG}${tag}`.slice(0, 15);
}
function makeIccid(tag: string) {
  return `IC${TEST_TAG}${tag}`.slice(0, 20);
}
function makeMsisdn(tag: string) {
  return `MS${TEST_TAG}${tag}`.slice(0, 15);
}
function makePassport(tag: string) {
  return `PP${TEST_TAG}${tag}`.slice(0, 50);
}

async function ensureNationality() {
  await prisma.nationality.upsert({
    where: { code: NATIONALITY_CODE },
    update: {},
    create: { code: NATIONALITY_CODE, name: "Test Nationality" },
  });
}

async function cleanupStaleTestData() {
  await prisma.subscriber.deleteMany({
    where: {
      OR: [
        { simInventory: { category: "test-emrg" } },
        { msisdnPool: { some: { category: "test-emrg" } } },
      ],
    },
  });
  await prisma.msisdnPool.deleteMany({ where: { category: "test-emrg" } });
  await prisma.simInventory.deleteMany({ where: { category: "test-emrg" } });
}

async function createSim(tag: string) {
  return prisma.simInventory.create({
    data: {
      imsi: makeImsi(tag),
      iccid: makeIccid(tag),
      type: "esim",
      category: "test-emrg",
      status: "available",
    },
  });
}

async function createMsisdn(tag: string) {
  return prisma.msisdnPool.create({
    data: {
      msisdn: makeMsisdn(tag),
      category: "test-emrg",
      status: "available",
    },
  });
}

async function cleanup() {
  await prisma.subscriber.deleteMany({
    where: { passportNumber: { startsWith: `PP${TEST_TAG}` } },
  });
  await prisma.msisdnPool.deleteMany({
    where: { msisdn: { startsWith: `MS${TEST_TAG}` } },
  });
  await prisma.simInventory.deleteMany({
    where: { imsi: { startsWith: `IM${TEST_TAG}` } },
  });
}

function subscriberInput(simId: string, msisdnId: string, tag: string) {
  return {
    surname: "Test",
    other_names: "User",
    gender: "Female",
    date_of_birth: new Date("1990-05-14"),
    nationality_code: NATIONALITY_CODE,
    id_type: "Passport",
    passport_number: makePassport(tag),
    passport_issue_date: new Date("2019-01-15"),
    passport_expiry: new Date("2029-01-01"),
    visa_type: "eVisa",
    visa_number: `V-${tag}`,
    visa_issue_date: new Date("2026-06-01"),
    visa_expiry_date: new Date("2030-01-01"),
    purpose_of_visit: "tourism",
    entry_point: "JKIA",
    arrival_date: new Date("2026-07-01"),
    intended_duration_days: 14,
    accommodation: "Nairobi Serena Hotel",
    sim_inventory_id: simId,
    msisdn_id: msisdnId,
    date_of_registration: new Date("2026-07-29"),
    registration_type: "new",
    registered_by: "Border Agent",
    registration_booth: "B-04",
    agent_id: "AGT-102",
    agent_number: "102",
    agent_name: "Safari Partners Ltd",
    subscriber_photo_url: `https://cdn.example.com/photo-${tag}.jpg`,
    passport_bio_page_url: `https://cdn.example.com/passport-${tag}.jpg`,
    visa_page_url: `https://cdn.example.com/visa-${tag}.jpg`,
    application_form_url: `https://cdn.example.com/form-${tag}.pdf`,
  };
}

describe("EMRG resource API corrections", () => {
  beforeAll(async () => {
    await cleanupStaleTestData();
    await ensureNationality();
  });
  afterEach(cleanup);

  it("returns randomized available resources", async () => {
    for (let i = 0; i < 3; i++) {
      await createSim(`R${i}`);
      await createMsisdn(`R${i}`);
    }

    const sims1 = await listAvailableSimInventory({ limit: 3, category: "test-emrg" });
    const msisdns1 = await listAvailableMsisdn({ limit: 3, category: "test-emrg" });
    expect(sims1.length).toBe(3);
    expect(msisdns1.length).toBe(3);

    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const batch = await listAvailableSimInventory({ limit: 3, category: "test-emrg" });
      orders.add(batch.map((b) => b.resource_id).join(","));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("creates a subscriber from available resources (external push)", async () => {
    const sim = await createSim("A");
    const msisdn = await createMsisdn("A");

    const sub = await createSubscriber(subscriberInput(sim.id, msisdn.id, "A"));
    expect(sub.provider_sync_status).toBe("queued");
    expect(sub.status).toBe("active");
    expect(sub.simInventory?.iccid).toBe(sim.iccid);
    expect(sub.msisdnPool?.[0]?.msisdn).toBe(msisdn.msisdn);

    const simAfter = await prisma.simInventory.findUnique({ where: { id: sim.id } });
    const msisdnAfter = await prisma.msisdnPool.findUnique({ where: { id: msisdn.id } });
    expect(simAfter?.status).toBe("assigned");
    expect(msisdnAfter?.status).toBe("assigned");
  });

  it("creates a subscriber using iccid and msisdn", async () => {
    const sim = await createSim("I");
    const msisdn = await createMsisdn("I");

    const sub = await createSubscriber({
      surname: "Test",
      other_names: "Iccid",
      nationality_code: NATIONALITY_CODE,
      passport_number: makePassport("I"),
      visa_expiry_date: new Date("2030-01-01"),
      iccid: sim.iccid,
      msisdn: msisdn.msisdn,
    });

    expect(sub.provider_sync_status).toBe("queued");
    expect(sub.simInventory?.iccid).toBe(sim.iccid);
    expect(sub.msisdnPool?.[0]?.msisdn).toBe(msisdn.msisdn);
  });

  it("persists subscriber overview fields and document URLs", async () => {
    const sim = await createSim("F");
    const msisdn = await createMsisdn("F");

    const input = subscriberInput(sim.id, msisdn.id, "F");
    const sub = await createSubscriber(input);

    expect(sub.idType).toBe("Passport");
    expect(sub.passportIssueDate).toBeInstanceOf(Date);
    expect(sub.visaIssueDate).toBeInstanceOf(Date);
    expect(sub.registrationType).toBe("new");
    expect(sub.agentNumber).toBe("102");
    expect(sub.registeredAt).toEqual(new Date("2026-07-29"));
    expect(sub.documents?.subscriber_photo?.url).toBe(`https://cdn.example.com/photo-F.jpg`);
    expect(sub.documents?.passport_bio_page?.url).toBe(`https://cdn.example.com/passport-F.jpg`);
    expect(sub.documents?.visa_page?.url).toBe(`https://cdn.example.com/visa-F.jpg`);
    expect(sub.documents?.application_form?.url).toBe(`https://cdn.example.com/form-F.pdf`);
  });

  it("creates subscribers idempotently and race-guards resource status", async () => {
    const sim = await createSim("B");
    const msisdn = await createMsisdn("B");

    const first = await createSubscriber(subscriberInput(sim.id, msisdn.id, "B"));
    expect(first.provider_sync_status).toBe("queued");
    expect(first.status).toBe("active");

    const second = await createSubscriber(subscriberInput(sim.id, msisdn.id, "B"));
    expect(second.provider_sync_status).toBe("already_registered");
    expect(second.id).toBe(first.id);

    const simOther = await createSim("C");
    const msisdnOther = await createMsisdn("C");
    await prisma.simInventory.update({
      where: { id: simOther.id },
      data: { status: "quarantined" },
    });
    try {
      await createSubscriber(subscriberInput(simOther.id, msisdnOther.id, "C"));
      expect.fail("expected 409 on unavailable resources");
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
    }
  });

  it("cannot release a resource that is already assigned", async () => {
    const sim = await createSim("D");
    const msisdn = await createMsisdn("D");

    await createSubscriber(subscriberInput(sim.id, msisdn.id, "D"));

    try {
      await releaseSimInventory(sim.id);
      expect.fail("expected 409 on assigned SIM");
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
    }
  });

  it("provisions, idempotently re-provisions, and releases resources", async () => {
    const sim = await createSim("A");
    const msisdn = await createMsisdn("A");

    const simProv = (await provisionSimInventory(sim.id, {
      provider_id: "emrg-test",
      provider_confirmation_ref: "sim-ref",
    }))!;
    expect(simProv.status).toBe("provisioned");

    const msisdnProv = (await provisionMsisdn(msisdn.id, {
      provider_id: "emrg-test",
      provider_confirmation_ref: "msisdn-ref",
    }))!;
    expect(msisdnProv.status).toBe("provisioned");

    const simAgain = (await provisionSimInventory(sim.id, {
      provider_id: "emrg-test",
      provider_confirmation_ref: "sim-ref",
    }))!;
    expect(simAgain.id).toBe(simProv.id);
    expect(simAgain.status).toBe("provisioned");

    try {
      await provisionSimInventory(sim.id, {
        provider_id: "emrg-test",
        provider_confirmation_ref: "different-ref",
      });
      expect.fail("expected 409 on mismatched idempotency key");
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
    }

    const releasedSim = await releaseSimInventory(sim.id);
    const releasedMsisdn = await releaseMsisdn(msisdn.id);
    expect(releasedSim.status).toBe("available");
    expect(releasedMsisdn.status).toBe("available");
  });

  it("releases orphaned provisioned resources", async () => {
    const sim = await createSim("E");
    const msisdn = await createMsisdn("E");

    const old = new Date(Date.now() - 20 * 60 * 1000);
    await provisionSimInventory(sim.id, {
      provider_id: "emrg-test",
      provider_confirmation_ref: "sim-orphan",
      provisioned_at: old,
    });
    await provisionMsisdn(msisdn.id, {
      provider_id: "emrg-test",
      provider_confirmation_ref: "msisdn-orphan",
      provisioned_at: old,
    });

    const simResult = await releaseOrphanedSims();
    const msisdnResult = await releaseOrphanedMsisdns();
    expect(simResult.released).toBeGreaterThanOrEqual(1);
    expect(msisdnResult.released).toBeGreaterThanOrEqual(1);

    const simAfter = await prisma.simInventory.findUnique({ where: { id: sim.id } });
    const msisdnAfter = await prisma.msisdnPool.findUnique({ where: { id: msisdn.id } });
    expect(simAfter?.status).toBe("available");
    expect(msisdnAfter?.status).toBe("available");
  });
});
