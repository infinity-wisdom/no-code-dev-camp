import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { BREVO_TEMPLATE_IDS } from "./emailTemplates";

/** Has this one-time trigger already fired for this lead? */
function alreadySent(lead: { sentEmailTriggers?: string[] }, key: string): boolean {
  return (lead.sentEmailTriggers ?? []).includes(key);
}

/** Trigger 1 — called once, right after leads:create inserts a brand-new lead. */
export const afterLeadCreated = internalMutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead || alreadySent(lead, "welcome")) return;

    await ctx.db.patch(args.leadId, {
      sentEmailTriggers: [...(lead.sentEmailTriggers ?? []), "welcome"],
    });

    await ctx.scheduler.runAfter(0, internal.brevoClient.sendTemplateEmail, {
      templateId: BREVO_TEMPLATE_IDS.welcome,
      toEmail: lead.email,
      toName: lead.firstName,
      params: { firstName: lead.firstName },
    });
  },
});

/**
 * Triggers 2–6 — called once, right after leads:create inserts a new
 * referral row for `referrerEmail`. Recomputes that referrer's total count
 * and current leaderboard rank in the same transaction, so "first time"
 * milestones and rank-crossing are both detected reliably.
 */
export const afterReferralInserted = internalMutation({
  args: {
    referrerEmail: v.string(),
    referredName: v.string(),
  },
  handler: async (ctx, args) => {
    const referrer = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.referrerEmail))
      .unique();
    if (!referrer) return; // referredByEmail didn't match a real lead — nothing to notify

    // --- Referral count milestones (2, 3, 4) -----------------------------
    // Referral counts only ever increase by exactly 1 per event, so an exact
    // equality check naturally fires once and only once per threshold —
    // no extra flag needed for these three.
    const referrerReferrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerEmail", args.referrerEmail))
      .collect();
    const referralCount = referrerReferrals.length;

    if (referralCount === 1) {
      await ctx.scheduler.runAfter(0, internal.brevoClient.sendTemplateEmail, {
        templateId: BREVO_TEMPLATE_IDS.firstReferral,
        toEmail: referrer.email,
        toName: referrer.firstName,
        params: { firstName: referrer.firstName, referredName: args.referredName },
      });
    } else if (referralCount === 3) {
      await ctx.scheduler.runAfter(0, internal.brevoClient.sendTemplateEmail, {
        templateId: BREVO_TEMPLATE_IDS.threeReferrals,
        toEmail: referrer.email,
        toName: referrer.firstName,
        params: { firstName: referrer.firstName, referralCount },
      });
    } else if (referralCount === 10) {
      await ctx.scheduler.runAfter(0, internal.brevoClient.sendTemplateEmail, {
        templateId: BREVO_TEMPLATE_IDS.tenReferrals,
        toEmail: referrer.email,
        toName: referrer.firstName,
        params: { firstName: referrer.firstName, referralCount },
      });
    }

    // --- Leaderboard rank milestones (5, 6) ------------------------------
    // Unlike the counts above, rank isn't guaranteed to only move one
    // direction (someone else's referrals can push you back out of the top
    // 10 later), so "first time" here genuinely needs a persisted flag
    // rather than relying on exact-equality timing.
    const allReferrals = await ctx.db.query("referrals").collect();
    const counts = new Map<string, number>();
    for (const r of allReferrals) {
      counts.set(r.referrerEmail, (counts.get(r.referrerEmail) ?? 0) + 1);
    }
    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const rank = ranked.findIndex(([email]) => email === args.referrerEmail) + 1; // 1-indexed, 0 means not found

    if (rank > 0) {
      const newFlags = new Set(referrer.sentEmailTriggers ?? []);
      let changed = false;

      if (rank <= 3 && !newFlags.has("top_3")) {
        newFlags.add("top_3");
        newFlags.add("top_10"); // being top 3 implies top 10 — don't also send the top-10 email later
        changed = true;
        await ctx.scheduler.runAfter(0, internal.brevoClient.sendTemplateEmail, {
          templateId: BREVO_TEMPLATE_IDS.firstTop3,
          toEmail: referrer.email,
          toName: referrer.firstName,
          params: { firstName: referrer.firstName, rank },
        });
      } else if (rank <= 10 && !newFlags.has("top_10")) {
        newFlags.add("top_10");
        changed = true;
        await ctx.scheduler.runAfter(0, internal.brevoClient.sendTemplateEmail, {
          templateId: BREVO_TEMPLATE_IDS.firstTop10,
          toEmail: referrer.email,
          toName: referrer.firstName,
          params: { firstName: referrer.firstName, rank },
        });
      }

      if (changed) {
        await ctx.db.patch(referrer._id, { sentEmailTriggers: Array.from(newFlags) });
      }
    }
  },
});

/** Triggers 7–9 — called once, right after a purchase flips to "paid". */
export const afterPurchasePaid = internalMutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) return;

    const lead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", purchase.leadEmail))
      .unique();
    const firstName = lead?.firstName ?? "";

    const templateByTier = {
      budget_2500: BREVO_TEMPLATE_IDS.paidBudget,
      main_3500: BREVO_TEMPLATE_IDS.paidMain,
      live_5000: BREVO_TEMPLATE_IDS.paidLive,
    } as const;

    await ctx.scheduler.runAfter(0, internal.brevoClient.sendTemplateEmail, {
      templateId: templateByTier[purchase.tier],
      toEmail: purchase.leadEmail,
      toName: firstName,
      params: { firstName, amount: purchase.amount },
    });
  },
});
