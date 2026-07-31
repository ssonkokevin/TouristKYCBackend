import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { listNotifications, markRead } from "../services/notificationsService.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const listSchema = z.object({
  unread: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const filters = listSchema.parse(req.query);
    const result = await listNotifications(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const result = await markRead(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
