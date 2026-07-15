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
  // the live upsell). Created as "pending" from the client; a real payment
  // gateway webhook (see convex/http.ts) would flip it to "paid".
  purchases: defineTable({
    leadEmail: v.string(),
    tier: v.union(
      v.literal("budget_2500"),
      v.literal("main_3500"),
      v.literal("live_5000"),
    ),
    status: v.union(v.literal("pending"), v.literal("paid")),
    createdAt: v.number(),
  }).index("by_email", ["leadEmail"]),

  // One row per successful referral, written transactionally inside
  // leads.create when a new lead signs up with a referredByEmail.
  referrals: defineTable({
    referrerEmail: v.string(),
    referredEmail: v.string(),
    referredName: v.string(),
    createdAt: v.number(),
  }).index("by_referrer", ["referrerEmail"]),
});
