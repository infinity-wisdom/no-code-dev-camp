import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create (or reuse) a lead, and — if they arrived via a referral link —
 * record the referral in the same transaction. This backs the opt-in form
 * on index.html.
 */
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    referredByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      // Lead already exists (e.g. they re-submitted the form) — don't
      // duplicate the row or double-count the referral.
      return existing._id;
    }

    const leadId = await ctx.db.insert("leads", {
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      phone: args.phone,
      referredByEmail: args.referredByEmail,
      createdAt: Date.now(),
    });

    // Don't let someone credit themselves for their own referral link.
    if (args.referredByEmail && args.referredByEmail.toLowerCase() !== email) {
      await ctx.db.insert("referrals", {
        referrerEmail: args.referredByEmail.toLowerCase(),
        referredEmail: email,
        referredName: `${args.firstName} ${args.lastName}`.trim(),
        createdAt: Date.now(),
      });
    }

    return leadId;
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
  },
});

/**
 * Internal — called only from convex/http.ts right after a successful
 * signup, once the browser's follow-up request to the HTTP action tells us
 * the real request IP (the WebSocket client used for the `create` mutation
 * above never sees it). Never called directly from the browser.
 */
export const setIpHashForEmail = internalMutation({
  args: { email: v.string(), ipHash: v.string() },
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
    if (!lead) return;
    await ctx.db.patch(lead._id, { ipHash: args.ipHash });
  },
});

/**
 * Internal — used by the GET /leads/recognize HTTP action to look up a
 * returning visitor by their (hashed) IP. If multiple leads share an IP
 * (common on shared/carrier-grade NAT connections), this returns the most
 * recently created one — a deliberate, documented best-effort tradeoff,
 * not a guarantee of correctness.
 */
export const getByIpHash = internalQuery({
  args: { ipHash: v.string() },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("leads")
      .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
      .collect();
    if (matches.length === 0) return null;
    return matches.reduce((latest, lead) => (lead.createdAt > latest.createdAt ? lead : latest));
  },
});
