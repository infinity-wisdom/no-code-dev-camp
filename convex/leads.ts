import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
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

    // Trigger 1 — welcome email. Scheduled rather than sent inline so a slow
    // or failed Brevo call never blocks or fails the signup itself.
    await ctx.scheduler.runAfter(0, internal.emailTriggers.afterLeadCreated, { leadId });

    // Don't let someone credit themselves for their own referral link.
    if (args.referredByEmail && args.referredByEmail.toLowerCase() !== email) {
      await ctx.db.insert("referrals", {
        referrerEmail: args.referredByEmail.toLowerCase(),
        referredEmail: email,
        referredName: `${args.firstName} ${args.lastName}`.trim(),
        createdAt: Date.now(),
      });

      // Triggers 2–6 — referral count + leaderboard rank milestones for the referrer.
      await ctx.scheduler.runAfter(0, internal.emailTriggers.afterReferralInserted, {
        referrerEmail: args.referredByEmail.toLowerCase(),
        referredName: `${args.firstName} ${args.lastName}`.trim(),
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

/**
 * Internal — used by convex/reminders.ts (the 7/3/1-day countdown cron) to
 * notify every signed-up lead, regardless of payment status.
 */
export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("leads").collect(),
});

/** Internal — looks up a single lead by ID, used by convex/reminders.ts. */
export const getById = internalQuery({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => ctx.db.get(args.leadId),
});

/**
 * Internal — marks a one-time trigger key as sent for this lead. Shared by
 * convex/emailTriggers.ts and convex/reminders.ts so both use the same
 * idempotency mechanism.
 */
export const markTriggerSent = internalMutation({
  args: { leadId: v.id("leads"), triggerKey: v.string() },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return;
    const flags = new Set(lead.sentEmailTriggers ?? []);
    if (flags.has(args.triggerKey)) return;
    flags.add(args.triggerKey);
    await ctx.db.patch(args.leadId, { sentEmailTriggers: Array.from(flags) });
  },
});
