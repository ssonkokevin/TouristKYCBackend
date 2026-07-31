// One-off connectivity check for Supabase Storage.
// Usage: node scripts/test-supabase-storage.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const bucket = SUPABASE_BUCKET || "image_uploads";

async function main() {
  console.log(`Checking bucket "${bucket}" at ${SUPABASE_URL} ...`);

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("FAILED to list buckets:", listErr.message);
    process.exit(1);
  }
  console.log(`Available buckets: ${buckets.map((b) => b.name).join(", ") || "(none)"}`);
  const found = buckets.find((b) => b.name === bucket);
  console.log(found ? `✔ Bucket "${bucket}" exists (public: ${found.public})` : `✘ Bucket "${bucket}" NOT found`);

  const testPath = `connectivity-test/${Date.now()}.txt`;
  const content = Buffer.from(`Supabase storage test - ${new Date().toISOString()}`);

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(testPath, content, { contentType: "text/plain", upsert: true });

  if (uploadErr) {
    console.error("FAILED to upload test file:", uploadErr.message);
    process.exit(1);
  }
  console.log(`✔ Uploaded test file to: ${uploadData.path}`);

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
  console.log(`✔ Public URL: ${publicUrlData.publicUrl}`);

  const { error: removeErr } = await supabase.storage.from(bucket).remove([testPath]);
  if (removeErr) {
    console.warn("Could not clean up test file:", removeErr.message);
  } else {
    console.log("✔ Cleaned up test file");
  }

  console.log("\nSupabase storage is working correctly.");
}

main();
