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
    createdAt: v.number(),
  }).index("by_email", ["email"]),

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

  // One row per successful referral, written transactionally inside
  // leads.create when a new lead signs up with a referredByEmail.
  referrals: defineTable({
    referrerEmail: v.string(),
    referredEmail: v.string(),
    referredName: v.string(),
    createdAt: v.number(),
  }).index("by_referrer", ["referrerEmail"]),
});
