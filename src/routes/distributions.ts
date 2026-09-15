import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { getNationalityDistribution, getPurposeDistribution, getStatusDistribution } from "../services/distributionsService.js";

export const distributionsRouter = Router();

distributionsRouter.use(requireAuth);

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

distributionsRouter.get("/nationality", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getNationalityDistribution(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

distributionsRouter.get("/purpose", async (_req, res, next) => {
  try {
    const data = await getPurposeDistribution();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

distributionsRouter.get("/status", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getStatusDistribution(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
