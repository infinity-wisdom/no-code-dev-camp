import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { CURRENCY, TIER_PRICING } from "./pricing";

/**
 * Record purchase intent as "pending" and hand back everything the client
 * needs to open the Flutterwave checkout modal — including a server-generated
 * txRef and the canonical price for this tier. The client never gets to
 * dictate the amount; that's looked up from TIER_PRICING here.
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
    const leadEmail = args.leadEmail.trim().toLowerCase();
    const amount = TIER_PRICING[args.tier];
    const txRef = `nca_${args.tier}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const purchaseId = await ctx.db.insert("purchases", {
      leadEmail,
      tier: args.tier,
      status: "pending",
      amount,
      currency: CURRENCY,
      txRef,
      createdAt: Date.now(),
    });

    return { purchaseId, txRef, amount, currency: CURRENCY };
  },
});

/** Internal — only callable from other Convex functions (actions/http actions), never directly from the browser. */
export const getById = internalQuery({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => ctx.db.get(args.purchaseId),
});

export const getByTxRef = internalQuery({
  args: { txRef: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("purchases")
      .withIndex("by_txRef", (q) => q.eq("txRef", args.txRef))
      .unique();
  },
});

/**
 * Internal — flips a purchase to "paid". Only ever called after
 * convex/payments.ts has verified the transaction directly against
 * Flutterwave's API. There is deliberately no public mutation that can mark
 * a purchase paid — that decision must never be trusted from the browser.
 */
export const markPaidById = internalMutation({
  args: { purchaseId: v.id("purchases"), flwTransactionId: v.string() },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.status === "paid") return; // idempotent
    await ctx.db.patch(args.purchaseId, { status: "paid", flwTransactionId: args.flwTransactionId });
  },
});

export const markFailedById = internalMutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.status === "paid") return;
    await ctx.db.patch(args.purchaseId, { status: "failed" });
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("purchases")
      .withIndex("by_email", (q) => q.eq("leadEmail", args.email.trim().toLowerCase()))
      .collect();
  },
});

/**
 * Public — deliberately narrow. Returns only the list of tiers this email
 * has a "paid" purchase for (e.g. ["live_5000"]), never full purchase
 * records (amounts, txRef, Flutterwave transaction IDs, etc.). This is what
 * dashboard.html uses to decide whether to unlock the Telegram community
 * card — everyone who signs up gets a dashboard regardless of payment
 * status, but Telegram access specifically requires having paid for the
 * ₦5,000 live tier.
 */
export const getPaidTiersForEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_email", (q) => q.eq("leadEmail", args.email.trim().toLowerCase()))
      .collect();
    return purchases.filter((p) => p.status === "paid").map((p) => p.tier);
  },
});
