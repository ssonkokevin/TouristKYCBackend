import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { getByVisaType, getByPurpose, getByNationality } from "../services/reportsService.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

reportsRouter.get("/by-visa-type", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getByVisaType(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/by-purpose-of-visit", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getByPurpose(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/by-nationality", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const data = await getByNationality(from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
