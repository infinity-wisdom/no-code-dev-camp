import { query } from "./_generated/server";
import { v } from "convex/values";

/** How many people this email has referred — drives the progress bar and reward unlocks. */
export const countForEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerEmail", args.email.trim().toLowerCase()))
      .collect();
    return rows.length;
  },
});

/** Most recent people this email has referred — powers the "Recent Referrals" list. */
export const recentForReferrer = query({
  args: { email: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerEmail", args.email.trim().toLowerCase()))
      .order("desc")
      .take(args.limit ?? 5);
    return rows;
  },
});

/**
 * Top referrers overall. This scans the whole referrals table and reduces
 * in-memory, which is fine at the scale of a single-cohort bootcamp funnel.
 * If this ever needs to run at real scale, maintain a running per-referrer
 * counter table instead of aggregating on every read.
 */
export const leaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("referrals").collect();

    const counts = new Map<string, number>();
    for (const r of all) {
      counts.set(r.referrerEmail, (counts.get(r.referrerEmail) ?? 0) + 1);
    }

    const ranked = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, args.limit ?? 10);

    // Attach a display name for each referrer by looking up their lead record.
    const results = [];
    for (const [email, count] of ranked) {
      const lead = await ctx.db
        .query("leads")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      results.push({
        email,
        name: lead ? `${lead.firstName} ${lead.lastName.charAt(0)}.` : email,
        count,
      });
    }
    return results;
  },
});
