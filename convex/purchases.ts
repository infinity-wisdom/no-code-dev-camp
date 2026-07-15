import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Record intent to buy a tier as "pending". Called from main-offer.html,
 * budget-offer.html, and the live-access button on dashboard.html.
 *
 * TODO(backend): a real payment gateway (Paystack/Flutterwave) checkout
 * should be opened alongside this call, and its webhook should call
 * `purchases.markPaid` (via convex/http.ts) once payment is confirmed.
 */
export const create = mutation({
  args: {
    leadEmail: v.string(),
    tier: v.union(
      v.literal("budget_2500"),
      v.literal("main_3500"),
      v.literal("live_5000"),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("purchases", {
      leadEmail: args.leadEmail.trim().toLowerCase(),
      tier: args.tier,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const markPaid = mutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.purchaseId, { status: "paid" });
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("purchases")
      .withIndex("by_email", (q) => q.eq("leadEmail", args.email.trim().toLowerCase()))
      .collect();
  },
});
