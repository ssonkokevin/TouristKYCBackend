import { createServer } from "http";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "./app.js";
import { config } from "./config.js";
import { io } from "./sockets/index.js";
import { startJobWorkers } from "./jobs/worker.js";
import { startJobSchedulers } from "./jobs/scheduler.js";
import { backendLogger } from "./lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_ROOT = path.resolve(__dirname, "../logs");
for (const subdir of ["backend", "jobs", "frontend"]) {
  mkdirSync(path.join(LOG_ROOT, subdir), { recursive: true });
}

const httpServer = createServer(app);
io.attach(httpServer);

async function main() {
  await startJobWorkers();
  startJobSchedulers();

  httpServer.listen(config.PORT, () => {
    backendLogger.info(`Tourist KYC backend running on http://localhost:${config.PORT}`);
  });
}

main().catch((err) => {
  backendLogger.error("Failed to start server", { error: err?.message, stack: err?.stack });
  process.exit(1);
});
