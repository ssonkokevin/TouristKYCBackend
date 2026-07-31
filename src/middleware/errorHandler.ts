import { Response, NextFunction } from "express";
import { z } from "zod";
import { backendLogger } from "../lib/logger.js";
import { AuthRequest } from "./requireAuth.js";

export function errorHandler(err: any, req: AuthRequest, res: Response, _next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: "Validation error", issues: err.issues });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message: string = err.message || "Internal server error";

  backendLogger.error(message, {
    status: statusCode,
    path: req.originalUrl,
    method: req.method,
    ...(req.user ? { user: req.user.id } : {}),
    stack: err.stack,
  });

  const body = err.body || { error: "Internal server error", message };
  res.status(statusCode).json(body);
}
