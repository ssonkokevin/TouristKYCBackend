import { Router } from "express";
import { z } from "zod";
import { frontendLogger } from "../lib/logger.js";

export const logsRouter = Router();

const frontendLogSchema = z.object({
  level: z.enum(["error", "warn", "info", "debug"]).default("error"),
  message: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});

logsRouter.post("/frontend", (req, res) => {
  const parsed = frontendLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid log payload" });
    return;
  }

  const { level, message, context } = parsed.data;
  frontendLogger[level](message, context ?? {});

  res.status(204).end();
});
