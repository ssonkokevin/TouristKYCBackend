import { Request, Response, NextFunction } from "express";
import { backendLogger } from "../lib/logger.js";

function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase();
      if (["password", "secret", "token", "authorization", "cookie", "set-cookie", "jwt"].includes(normalizedKey)) {
        output[key] = "[redacted]";
        continue;
      }
      output[key] = sanitizeForLog(item);
    }
    return output;
  }
  return value;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  const captureResponse = (payload: unknown) => {
    const responsePayload = sanitizeForLog(payload);
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    const requestBody = req.method !== "GET" && req.method !== "DELETE" && req.body ? sanitizeForLog(req.body) : undefined;
    backendLogger[level](`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration_ms: ms,
      ip: req.ip,
      user: (req as any).user ? { id: (req as any).user.id, name: (req as any).user.name } : undefined,
      requestBody,
      responseBody: responsePayload,
      query: sanitizeForLog(req.query),
    });
  };

  res.json = ((body: unknown) => {
    const result = originalJson(body);
    captureResponse(body);
    return result;
  }) as typeof res.json;

  res.send = ((body: any) => {
    captureResponse(body);
    return originalSend(body);
  }) as typeof res.send;

  res.on("finish", () => {
    if (!res.headersSent) {
      captureResponse({ message: "No response payload captured" });
    }
  });

  next();
}
