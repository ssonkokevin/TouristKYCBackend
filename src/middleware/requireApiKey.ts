import { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("ApiKey ") || auth.slice(7) !== config.INBOUND_API_KEY) {
    res.status(401).json({ error: "unauthorized", message: "Invalid API key" });
    return;
  }
  next();
}
