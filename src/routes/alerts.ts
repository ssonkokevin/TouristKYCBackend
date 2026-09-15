import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { getVisaExpiryAlerts, getRegistrationTrend } from "../services/alertsService.js";

export const alertsRouter = Router();

alertsRouter.use(requireAuth);

const rangeSchema = z.object({
  range: z.enum(["7d", "1m", "6m", "1y"]).default("7d"),
});

alertsRouter.get("/visa-expiry", async (req, res, next) => {
  try {
    const { range } = rangeSchema.parse(req.query);
    const data = await getVisaExpiryAlerts(range);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const trendSchema = z.object({
  days: z.coerce.number().min(7).max(365).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

alertsRouter.get("/trends/registrations", async (req, res, next) => {
  try {
    const { days, from, to } = trendSchema.parse(req.query);
    const data = await getRegistrationTrend(from && to ? { from, to } : days ?? 30);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
