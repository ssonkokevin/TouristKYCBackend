import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { listSuspensions, reactivate } from "../services/suspensionsService.js";

export const suspensionsRouter = Router();

suspensionsRouter.use(requireAuth);

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(5000).default(20),
  name: z.string().optional(),
  msisdn: z.string().optional(),
  reason: z.enum(["visa_expired", "manual_review", "fraud_suspected", "payment_issue", "other"]).optional(),
  suspended_from: z.coerce.date().optional(),
  suspended_to: z.coerce.date().optional(),
});

suspensionsRouter.get("/", async (req, res, next) => {
  try {
    const filters = listSchema.parse(req.query);
    const result = await listSuspensions(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

suspensionsRouter.post("/:id/reactivate", async (req, res, next) => {
  try {
    const result = await reactivate(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
