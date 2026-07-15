import { mutation, query } from "./_generated/server";
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
