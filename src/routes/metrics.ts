import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getMetrics } from "../services/metricsService.js";

export const metricsRouter = Router();

metricsRouter.use(requireAuth);

metricsRouter.get("/", async (_req, res, next) => {
  try {
    const metrics = await getMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});
