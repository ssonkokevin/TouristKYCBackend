import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(1),
  PROVIDER_BASE_URL: z.string().url(),
  PROVIDER_API_KEY: z.string().min(1),
  PROVIDER_ASSIGN_ENDPOINT: z.string().min(1),
  PROVIDER_TIMEOUT_MS: z.coerce.number().default(10000),
  PROVIDER_MAX_RETRIES: z.coerce.number().default(5),
  INBOUND_API_KEY: z.string().min(1),
  RESERVATION_DEFAULT_HOLD_SECONDS: z.coerce.number().default(120),
  VISA_SUSPEND_LEAD_HOURS: z.coerce.number().default(24),
  DEREGISTER_STALE_DAYS: z.coerce.number().default(14),
  STORAGE_PROVIDER: z.enum(["local", "supabase"]).default("local"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default("subscriber-documents"),
  MOCK_PROVIDER_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  MOCK_PROVIDER_DELAY_MS: z.coerce.number().default(500),
});

export const config = envSchema.parse(process.env);
