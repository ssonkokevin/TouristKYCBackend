import { Router } from "express";
import { config } from "../config.js";

export const mockProviderRouter = Router();

mockProviderRouter.post("/api/sim/assign", async (_req, res) => {
  const delay = config.MOCK_PROVIDER_DELAY_MS;
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (Math.random() < config.MOCK_PROVIDER_FAILURE_RATE) {
    res.status(500).json({ status: "error", message: "Mock provider failure" });
    return;
  }

  res.json({
    status: "success",
    provider_subscriber_id: `SUB-${Math.floor(Math.random() * 100000)}`,
    activated_at: new Date().toISOString(),
  });
});
