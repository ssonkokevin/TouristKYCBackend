import { Request, Response, NextFunction } from "express";
import { backendLogger } from "../lib/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    backendLogger[level](`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration_ms: ms,
      ip: req.ip,
    });
  });

  next();
}
