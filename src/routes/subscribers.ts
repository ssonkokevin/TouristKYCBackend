import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/requireAuth.js";
import { requireApiKey } from "../middleware/requireApiKey.js";
import {
  createSubscriber,
  listSubscribers,
  getSubscriber,
  updateSubscriber,
} from "../services/subscriberService.js";
import { suspendSubscriber, deregisterSubscriber } from "../services/subscriberLifecycle.js";

export const subscribersRouter = Router();

// Allow-list of image MIME types accepted on inline document fields.
// SVG is intentionally excluded (can embed scripts). application_form may
// additionally be a PDF, matching the dashboard's existing upload input.
const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
];
const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024; // 10mb, matches uploadService's multer limit

function dataUriField(allowedMimeTypes: string[]) {
  return z
    .string()
    .refine(
      (value) => {
        const match = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(value);
        if (!match) return false;
        const [, mimeType, base64Payload] = match;
        if (!allowedMimeTypes.includes(mimeType.toLowerCase())) return false;
        // Rough decoded-size estimate from base64 length, avoids allocating a Buffer just to validate.
        const approxBytes = (base64Payload.replace(/\s/g, "").length * 3) / 4;
        return approxBytes <= MAX_INLINE_IMAGE_BYTES;
      },
      {
        message: `Must be a data URI (data:<mime-type>;base64,<data>) using one of: ${allowedMimeTypes.join(", ")}, up to ${MAX_INLINE_IMAGE_BYTES / (1024 * 1024)}MB`,
      }
    )
    .optional();
}

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(5000).default(20),
  status: z.enum(["active", "suspended", "deregistered"]).optional(),
  nationality: z.string().optional(),
  visa_expiry_from: z.coerce.date().optional(),
  visa_expiry_to: z.coerce.date().optional(),
  registered_from: z.coerce.date().optional(),
  registered_to: z.coerce.date().optional(),
  surname: z.string().optional(),
  other_names: z.string().optional(),
  name: z.string().optional(),
  passport_number: z.string().optional(),
  msisdn: z.string().optional(),
  sort_by: z.enum(["registeredAt", "visaExpiryDate"]).optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
});

subscribersRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listSchema.parse(req.query);
    const result = await listSubscribers(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const createSchema = z
  .object({
    surname: z.string().min(1),
    other_names: z.string().min(1),
    gender: z.string().optional(),
    date_of_birth: z.coerce.date().optional(),
    nationality_code: z.string().length(2),
    id_type: z.string().optional(),
    passport_number: z.string().min(1),
    passport_issue_date: z.coerce.date().optional(),
    passport_expiry: z.coerce.date().optional(),
    visa_type: z.string().optional(),
    visa_number: z.string().optional(),
    visa_issue_date: z.coerce.date().optional(),
    visa_expiry_date: z.coerce.date(),
    purpose_of_visit: z.enum(["tourism", "business", "study", "transit", "medical", "other"]).optional(),
    entry_point: z.string().optional(),
    arrival_date: z.coerce.date().optional(),
    intended_duration_days: z.coerce.number().optional(),
    accommodation: z.string().optional(),
    sim_inventory_id: z.string().uuid().optional(),
    msisdn_id: z.string().uuid().optional(),
    iccid: z.string().optional(),
    msisdn: z.string().optional(),
    date_of_registration: z.coerce.date().optional(),
    registration_type: z.string().optional(),
    registered_by: z.string().optional(),
    registration_booth: z.string().optional(),
    agent_id: z.string().optional(),
    agent_number: z.string().optional(),
    agent_name: z.string().optional(),
    subscriber_photo_url: z.string().optional(),
    passport_bio_page_url: z.string().optional(),
    visa_page_url: z.string().optional(),
    application_form_url: z.string().optional(),
    // Inline base64 images — preferred path now that the external system can
    // push image bytes directly instead of a pre-hosted URL. Takes priority
    // over the corresponding *_url field above when both are provided.
    subscriber_photo: dataUriField(ALLOWED_IMAGE_MIME_TYPES),
    passport_bio_page: dataUriField(ALLOWED_IMAGE_MIME_TYPES),
    visa_page: dataUriField(ALLOWED_IMAGE_MIME_TYPES),
    application_form: dataUriField([...ALLOWED_IMAGE_MIME_TYPES, "application/pdf"]),
  })
  .refine(
    (data) =>
      (data.sim_inventory_id && data.msisdn_id) ||
      (data.iccid && data.msisdn),
    {
      message: "Either sim_inventory_id + msisdn_id or iccid + msisdn must be provided",
      path: ["sim_inventory_id"],
    }
  );

// Pushed by EMRG's middleware using the shared INBOUND_API_KEY (not a dashboard JWT).
subscribersRouter.post("/", requireApiKey, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const subscriber = await createSubscriber(data);
    res.status(201).json(subscriber);
  } catch (err) {
    next(err);
  }
});

subscribersRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const subscriber = await getSubscriber(req.params.id);
    res.json(subscriber);
  } catch (err) {
    next(err);
  }
});

subscribersRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const subscriber = await updateSubscriber(req.params.id, req.body);
    res.json(subscriber);
  } catch (err) {
    next(err);
  }
});

const suspendSchema = z.object({
  reason: z.enum(["visa_expired", "manual_review", "fraud_suspected", "payment_issue", "other"]),
  reason_note: z.string().optional(),
});

subscribersRouter.post("/:id/suspend", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { reason, reason_note } = suspendSchema.parse(req.body);
    const suspendedBy = req.user!.name;
    const subscriber = await suspendSubscriber(req.params.id, reason, reason_note, suspendedBy);
    res.json(subscriber);
  } catch (err) {
    next(err);
  }
});

const deregisterSchema = z.object({
  reason: z.enum([
    "visa_expired_deregistered",
    "lost_card",
    "change_of_number",
    "customer_not_interested",
    "voluntary_deregistration",
    "fraud_suspected",
    "other",
  ]),
  reason_note: z.string().optional(),
});

subscribersRouter.post("/:id/deregister", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { reason, reason_note } = deregisterSchema.parse(req.body);
    const operator = req.user!.name;
    const subscriber = await deregisterSubscriber(req.params.id, reason, reason_note, operator);
    res.json(subscriber);
  } catch (err) {
    next(err);
  }
});
