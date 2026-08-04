import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth.js";
import { resourcesRouter } from "./routes/resources.js";
import { subscribersRouter } from "./routes/subscribers.js";
import { swaggerSpec, swaggerHtml } from "./lib/swagger.js";
import { simInventoryRouter } from "./routes/simInventory.js";
import { msisdnPoolRouter } from "./routes/msisdnPool.js";
import { metricsRouter } from "./routes/metrics.js";
import { alertsRouter } from "./routes/alerts.js";
import { distributionsRouter } from "./routes/distributions.js";
import { nationalitiesRouter } from "./routes/nationalities.js";
import { reportsRouter } from "./routes/reports.js";
import { syncLogRouter } from "./routes/syncLog.js";
import { notificationsRouter } from "./routes/notifications.js";
import { passportHistoryRouter } from "./routes/passportHistory.js";
import { suspensionsRouter } from "./routes/suspensions.js";
import { deregistrationsRouter } from "./routes/deregistrations.js";
import { documentsRouter } from "./routes/documents.js";
import { mockProviderRouter } from "./routes/mockProvider.js";
import { logsRouter } from "./routes/logs.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { config } from "./config.js";

export const app = express();

// We sit behind Nginx (and potentially other proxies) in production. Trusting
// the proxy ensures req.ip reflects the real client IP (via X-Forwarded-For),
// which is required for accurate rate limiting (e.g. /auth/login) and audit
// logs. TRUST_PROXY can be set to a hop count (e.g. "1") or "true"/"false".
if (config.TRUST_PROXY) {
  const trustProxyValue = config.TRUST_PROXY === "true" || config.TRUST_PROXY === "false"
    ? config.TRUST_PROXY === "true"
    : Number.isNaN(Number(config.TRUST_PROXY))
      ? config.TRUST_PROXY
      : Number(config.TRUST_PROXY);
  app.set("trust proxy", trustProxyValue);
}

app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL || true,
    credentials: true,
  })
);
app.use(requestLogger);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
app.get("/api-docs", (_req, res) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data:; connect-src 'self'"
  );
  res.send(swaggerHtml("/api-docs.json"));
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/resources", resourcesRouter);
app.use("/api/v1/subscribers", subscribersRouter);
app.use("/api/v1/sim-inventory", simInventoryRouter);
app.use("/api/v1/msisdn-pool", msisdnPoolRouter);
app.use("/api/v1/metrics", metricsRouter);
app.use("/api/v1/alerts", alertsRouter);
app.use("/api/v1/distributions", distributionsRouter);
app.use("/api/v1/nationalities", nationalitiesRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/sync-log", syncLogRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/passport-history", passportHistoryRouter);
app.use("/api/v1/suspensions", suspensionsRouter);
app.use("/api/v1/deregistrations", deregistrationsRouter);
app.use("/api/v1/documents", documentsRouter);
app.use("/mock-provider", mockProviderRouter);
app.use("/api/v1/logs", logsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);
