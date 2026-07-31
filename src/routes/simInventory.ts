import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listSimInventory,
  getSimInventory,
  importSimInventory,
  getSimInventorySummary,
} from "../services/simInventoryService.js";

export const simInventoryRouter = Router();

simInventoryRouter.use(requireAuth);

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  status: z.string().optional(),
  batch_id: z.string().optional(),
  type: z.enum(["esim", "physical"]).optional(),
  category: z.string().optional(),
  imsi: z.string().optional(),
  iccid: z.string().optional(),
  msisdn: z.string().optional(),
});

simInventoryRouter.get("/", async (req, res, next) => {
  try {
    const filters = listSchema.parse(req.query);
    const result = await listSimInventory(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

simInventoryRouter.get("/summary", async (_req, res, next) => {
  try {
    const summary = await getSimInventorySummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

simInventoryRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await getSimInventory(req.params.id);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

simInventoryRouter.post("/import", async (req, res, next) => {
  try {
    const result = await importSimInventory(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
