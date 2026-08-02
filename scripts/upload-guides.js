/**
 * One-time upload script for the two gated prep guide PDFs.
 *
 * Usage:
 *   1. Place the two PDF files in the project root as:
 *        prep-guide-1.pdf   (unlocks at 3 referrals)
 *        prep-guide-2.pdf   (unlocks at 10 referrals)
 *   2. Set the same admin secret in Convex and in your shell:
 *        npx convex env set ADMIN_UPLOAD_SECRET <a-long-random-string>
 *        export ADMIN_UPLOAD_SECRET=<the-same-string>        (macOS/Linux)
 *        $env:ADMIN_UPLOAD_SECRET = "<the-same-string>"       (Windows PowerShell)
 *   3. Run:
 *        node scripts/upload-guides.js
 *
 * Re-run any time you want to replace either file — it overwrites the
 * previous upload for that key rather than creating duplicates.
 */

const fs = require("fs");
const path = require("path");
const { ConvexHttpClient } = require("convex/browser");
const { anyApi } = require("convex/server");

function readConvexUrlFromEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return null;
  const contents = fs.readFileSync(envPath, "utf8");
  const match = contents.match(/^CONVEX_URL=(.*)$/m);
  return match ? match[1].trim() : null;
}

async function main() {
  const convexUrl = process.env.CONVEX_URL || readConvexUrlFromEnvLocal();
  const adminSecret = process.env.ADMIN_UPLOAD_SECRET;

  if (!convexUrl) {
    console.error("Could not find CONVEX_URL. Run `npx convex dev` at least once first, or set CONVEX_URL yourself.");
    process.exit(1);
  }
  if (!adminSecret) {
    console.error("ADMIN_UPLOAD_SECRET is not set in this shell. See the usage notes at the top of this script.");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  const files = [
    { key: "guide_1", path: path.join(__dirname, "..", "prep-guide-1.pdf"), label: "Prep Guide eBook 1 (3 referrals)" },
    { key: "guide_2", path: path.join(__dirname, "..", "prep-guide-2.pdf"), label: "Prep Guide eBook 2 (10 referrals)" },
  ];

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.warn(`Skipping ${file.label}: ${file.path} not found.`);
      continue;
    }

    console.log(`Uploading ${file.label}...`);

    const uploadUrl = await client.mutation(anyApi.guideFiles.generateUploadUrl, { adminSecret });

    const fileBuffer = fs.readFileSync(file.path);
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      console.error(`  Upload failed for ${file.label}: ${uploadRes.status} ${await uploadRes.text()}`);
      continue;
    }

    const { storageId } = await uploadRes.json();
    await client.mutation(anyApi.guideFiles.saveGuideFile, { adminSecret, key: file.key, storageId });

    console.log(`  Done — ${file.label} is now live behind the gate.`);
  }

  console.log("All done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
