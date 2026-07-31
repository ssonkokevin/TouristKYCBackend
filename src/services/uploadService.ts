import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { config } from "../config.js";

// Always buffer the upload in memory. Files are only ever written to local
// disk (see fallback below) when STORAGE_PROVIDER=local. Using diskStorage
// unconditionally here meant `file.buffer` was always undefined, silently
// breaking Supabase uploads.
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function uploadFile(file: Express.Multer.File, filePath: string): Promise<string> {
  if (config.STORAGE_PROVIDER === "supabase") {
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase credentials not configured");
    }
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.storage
      .from(config.SUPABASE_BUCKET)
      .upload(filePath, file.buffer, { upsert: true, contentType: file.mimetype });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from(config.SUPABASE_BUCKET).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  }

  // Local fallback
  const uploadsDir = "uploads";
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `${unique}-${file.originalname}`;
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return `/uploads/${filename}`;
}
