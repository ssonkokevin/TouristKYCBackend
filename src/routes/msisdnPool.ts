import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listMsisdnPool,
  getMsisdnPool,
  importMsisdnPool,
  getMsisdnPoolSummary,
} from "../services/msisdnPoolService.js";

export const msisdnPoolRouter = Router();

msisdnPoolRouter.use(requireAuth);

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  category: z.string().optional(),
  msisdn: z.string().optional(),
});

msisdnPoolRouter.get("/", async (req, res, next) => {
  try {
    const filters = listSchema.parse(req.query);
    const result = await listMsisdnPool(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

msisdnPoolRouter.get("/summary", async (_req, res, next) => {
  try {
    const summary = await getMsisdnPoolSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

msisdnPoolRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await getMsisdnPool(req.params.id);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

msisdnPoolRouter.post("/import", async (req, res, next) => {
  try {
    const result = await importMsisdnPool(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
