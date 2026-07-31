import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireApiKey } from "../middleware/requireApiKey.js";
import {
  listAvailableSimInventory,
  provisionSimInventory,
  lookupSimByIdentifier,
  releaseSimInventory,
} from "../services/simInventoryService.js";
import {
  listAvailableMsisdn,
  provisionMsisdn,
  lookupMsisdn,
  releaseMsisdn,
} from "../services/msisdnPoolService.js";

export const resourcesRouter = Router();

const resourceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.headers.authorization || req.ip) as string,
  message: { error: "Too many resource requests. Please slow down." },
});

resourcesRouter.use(requireApiKey);
resourcesRouter.use(resourceLimiter);

const availableSimSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(1),
  type: z.enum(["esim", "physical"]).optional(),
  category: z.string().optional(),
});

// Read-only: browse currently available SIMs (ICCID + IMSI, paired per record).
// Does not reserve/mutate anything, safe to call repeatedly.
resourcesRouter.get("/sim/available", async (req, res, next) => {
  try {
    const filters = availableSimSchema.parse(req.query);
    const resources = await listAvailableSimInventory(filters);
    res.json({ data: resources });
  } catch (err) {
    next(err);
  }
});

const availableMsisdnSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(1),
  category: z.string().optional(),
});

// Read-only: browse currently available MSISDNs. Does not reserve/mutate anything.
resourcesRouter.get("/msisdn/available", async (req, res, next) => {
  try {
    const filters = availableMsisdnSchema.parse(req.query);
    const resources = await listAvailableMsisdn(filters);
    res.json({ data: resources });
  } catch (err) {
    next(err);
  }
});

const provisionSchema = z.object({
  provider_id: z.string().min(1),
  provider_confirmation_ref: z.string().min(1),
  provisioned_at: z.coerce.date().optional(),
});

// Atomically claims a specific SIM (by resource_id from GET /sim/available) and
// marks it provisioned in one step. Call this once the SIM has actually been
// provisioned to the tourist's device.
resourcesRouter.post("/sim/:id/provision", async (req, res, next) => {
  try {
    const input = provisionSchema.parse(req.body);
    const resource = await provisionSimInventory(req.params.id, input);
    res.json({ data: resource });
  } catch (err) {
    next(err);
  }
});

const provisionMsisdnSchema = z.object({
  provider_id: z.string().min(1),
  provider_confirmation_ref: z.string().optional(),
  provisioned_at: z.coerce.date().optional(),
});

// Atomically claims a specific MSISDN (by resource_id from GET /msisdn/available)
// and marks it provisioned in one step.
resourcesRouter.post("/msisdn/:id/provision", async (req, res, next) => {
  try {
    const input = provisionMsisdnSchema.parse(req.body);
    const resource = await provisionMsisdn(req.params.id, input);
    res.json({ data: resource });
  } catch (err) {
    next(err);
  }
});

// Release a SIM that was provisioned but not yet assigned to a subscriber.
// This is used when the MSISDN provision fails or the registration is abandoned.
resourcesRouter.post("/sim/:id/release", async (req, res, next) => {
  try {
    const resource = await releaseSimInventory(req.params.id);
    res.json({ data: resource });
  } catch (err) {
    next(err);
  }
});

// Release an MSISDN that was provisioned but not yet assigned to a subscriber.
resourcesRouter.post("/msisdn/:id/release", async (req, res, next) => {
  try {
    const resource = await releaseMsisdn(req.params.id);
    res.json({ data: resource });
  } catch (err) {
    next(err);
  }
});

const simLookupSchema = z.object({
  imsi: z.string().optional(),
  iccid: z.string().optional(),
});

resourcesRouter.get("/imsi/lookup", async (req, res, next) => {
  try {
    const input = simLookupSchema.parse(req.query);
    const resource = await lookupSimByIdentifier(input);
    res.json({ data: resource });
  } catch (err) {
    next(err);
  }
});

const msisdnLookupSchema = z.object({
  msisdn: z.string().min(1),
});

resourcesRouter.get("/msisdn/lookup", async (req, res, next) => {
  try {
    const { msisdn } = msisdnLookupSchema.parse(req.query);
    const resource = await lookupMsisdn(msisdn);
    res.json({ data: resource });
  } catch (err) {
    next(err);
  }
});
