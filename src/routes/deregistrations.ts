import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { listDeregistrations } from "../services/deregistrationsService.js";

export const deregistrationsRouter = Router();

deregistrationsRouter.use(requireAuth);

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(5000).default(20),
  name: z.string().optional(),
  msisdn: z.string().optional(),
  reason: z.enum([
    "visa_expired_deregistered",
    "lost_card",
    "change_of_number",
    "customer_not_interested",
    "voluntary_deregistration",
    "fraud_suspected",
    "other",
  ]).optional(),
  deregistered_from: z.coerce.date().optional(),
  deregistered_to: z.coerce.date().optional(),
});

deregistrationsRouter.get("/", async (req, res, next) => {
  try {
    const filters = listSchema.parse(req.query);
    const result = await listDeregistrations(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
