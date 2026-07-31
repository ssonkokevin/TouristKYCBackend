import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getNationalityDistribution, getPurposeDistribution, getStatusDistribution } from "../services/distributionsService.js";

export const distributionsRouter = Router();

distributionsRouter.use(requireAuth);

distributionsRouter.get("/nationality", async (_req, res, next) => {
  try {
    const data = await getNationalityDistribution();
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

distributionsRouter.get("/status", async (_req, res, next) => {
  try {
    const data = await getStatusDistribution();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
