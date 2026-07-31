import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { listSyncLog, retrySyncLog } from "../services/syncLogService.js";

export const syncLogRouter = Router();

syncLogRouter.use(requireAuth);

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["pending", "success", "failed", "timeout"]).optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
});

syncLogRouter.get("/", async (req, res, next) => {
  try {
    const filters = listSchema.parse(req.query);
    const result = await listSyncLog(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

syncLogRouter.post("/:id/retry", async (req, res, next) => {
  try {
    const result = await retrySyncLog(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
