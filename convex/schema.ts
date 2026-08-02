import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Captured from the squeeze page (index.html) opt-in form.
  leads: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    // Email of the person who referred this lead, if they arrived via a
    // referral link (index.html?ref=<email>). Undefined for organic signups.
    referredByEmail: v.optional(v.string()),
    // Salted SHA-256 hash of the IP address seen at signup — never the raw
    // IP. Used only as a best-effort, no-login "welcome back" signal for
    // returning visitors on a new browser/device where localStorage is
    // empty. See convex/http.ts for how this is set and matched.
    ipHash: v.optional(v.string()),
    // Keys of one-time email triggers already sent for this lead (e.g.
    // "welcome", "first_referral", "top_10"). Checked before every one-time
    // send in convex/emailTriggers.ts so retries/re-runs never double-send.
    // An array rather than named boolean fields so new triggers don't need
    // a schema migration.
    sentEmailTriggers: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_ipHash", ["ipHash"]),

  // One row per offer a lead has clicked into (main-offer, budget-offer, or
  // the live upsell). Created as "pending" from the client via purchases:create,
  // which also generates a unique txRef and looks up the canonical price —
  // never trust a price sent from the browser. Flipped to "paid" only by
  // server-side code (convex/payments.ts action or convex/http.ts webhook)
  // after verifying the transaction directly with Flutterwave's API.
  purchases: defineTable({
    leadEmail: v.string(),
    tier: v.union(
      v.literal("budget_2500"),
      v.literal("main_3500"),
      v.literal("live_5000"),
    ),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    amount: v.number(),
    currency: v.string(),
    txRef: v.string(),
    flwTransactionId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["leadEmail"])
    .index("by_txRef", ["txRef"]),

  // One per gated file — maps a stable key ("guide_1", "guide_2") to a
  // Convex File Storage ID. Populated by scripts/upload-guides.js, not
  // edited by hand. The PDF bytes themselves live in Convex storage, not
  // in this repo or any public web path — the only way to get them is
  // through the gated /guides/download HTTP route in convex/http.ts.
  fileAssets: defineTable({
    key: v.string(),
    storageId: v.id("_storage"),
  }).index("by_key", ["key"]),
});
