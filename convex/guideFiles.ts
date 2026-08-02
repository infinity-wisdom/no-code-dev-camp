import { mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * The two gated rewards, and the referral count each requires. Referenced
 * by both convex/http.ts (to decide who can download) and this file (to
 * validate the `key` argument on upload).
 */
export const GUIDE_REQUIREMENTS: Record<"guide_1" | "guide_2", number> = {
  guide_1: 3, // Prep Guide eBook 1 — AI Prompt Engineering & Training Deliverables
  guide_2: 10, // Prep Guide eBook 2 — Backend Hosting, APIs & Cheat Sheets
};

/**
 * These two mutations have to be public (not internal) so the standalone
 * upload script (scripts/upload-guides.js) can call them from outside
 * Convex — an internal mutation can only be called from other Convex
 * functions, never from an external script or the browser.
 *
 * Being public means anyone technically *could* call these from a browser
 * console, so both are gated behind ADMIN_UPLOAD_SECRET — a shared secret
 * only you and the upload script know, not a real multi-user auth system,
 * but enough to stop a random visitor from overwriting these two files.
 *
 * TODO(backend): set this once, and use the same value in your local
 * .env.local when running the upload script:
 *   npx convex env set ADMIN_UPLOAD_SECRET <a-long-random-string>
 */
function assertAdmin(adminSecret: string) {
  const expected = process.env.ADMIN_UPLOAD_SECRET;
  if (!expected || adminSecret !== expected) {
    throw new Error("Unauthorized: invalid or missing ADMIN_UPLOAD_SECRET.");
  }
}

export const generateUploadUrl = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveGuideFile = mutation({
  args: {
    adminSecret: v.string(),
    key: v.union(v.literal("guide_1"), v.literal("guide_2")),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);

    const existing = await ctx.db
      .query("fileAssets")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      // Replacing a previously uploaded file — delete the old blob so it
      // doesn't sit around unused in storage.
      await ctx.storage.delete(existing.storageId);
      await ctx.db.patch(existing._id, { storageId: args.storageId });
    } else {
      await ctx.db.insert("fileAssets", { key: args.key, storageId: args.storageId });
    }
  },
});

/** Internal — used by convex/http.ts to find the storage ID for a gated download. */
export const getGuideStorageId = internalQuery({
  args: { key: v.union(v.literal("guide_1"), v.literal("guide_2")) },
  handler: async (ctx, args) => {
    const asset = await ctx.db
      .query("fileAssets")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return asset?.storageId ?? null;
  },
});
