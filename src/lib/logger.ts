import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_ROOT = path.resolve(__dirname, "../../logs");

const LEVEL_LABELS: Record<string, string> = {
  error: "ERR",
  warn: "WRN",
  info: "INF",
  debug: "DBG",
};

function formatLine(category: string) {
  return winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const label = LEVEL_LABELS[level] ?? level.toUpperCase().slice(0, 3);
    const ts = (timestamp as string).replace("Z", "+03:00");
    const ctx = Object.keys(meta).length
      ? " " +
        Object.entries(meta)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(" ")
      : "";
    return `${ts} [${category}] ${label} ${message}${ctx}`;
  });
}

function timestampTZ() {
  return winston.format.timestamp({
    format: () => {
      const now = new Date();
      const offset = 3 * 60;
      const local = new Date(now.getTime() + offset * 60 * 1000);
      return local.toISOString().replace("Z", "+03:00");
    },
  });
}

function makeLogger(category: string, subdir: string) {
  const dir = path.join(LOG_ROOT, subdir);
  return winston.createLogger({
    level: "debug",
    format: winston.format.combine(timestampTZ(), formatLine(category)),
    transports: [
      new DailyRotateFile({
        dirname: dir,
        filename: `${subdir}-log-%DATE%.txt`,
        datePattern: "YYYYMMDD",
        zippedArchive: false,
        maxFiles: "30d",
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          timestampTZ(),
          formatLine(category)
        ),
      }),
    ],
  });
}

export const backendLogger = makeLogger("BACKEND", "backend");
export const jobsLogger = makeLogger("JOBS", "jobs");
export const frontendLogger = makeLogger("FRONTEND", "frontend");
