import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { BREVO_TEMPLATE_IDS, TRAINING_START } from "./emailTemplates";

function daysUntilTraining(): number {
  const diffMs = TRAINING_START.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Triggers 10–12 — runs once a day (see convex/crons.ts). Only actually
 * sends anything on the three days that matter; every other day it's a
 * no-op. Goes to every signed-up lead regardless of payment status.
 */
export const sendCountdownReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const daysLeft = daysUntilTraining();

    const triggerByDay: Record<number, { key: string; templateId: number }> = {
      7: { key: "reminder_7_days", templateId: BREVO_TEMPLATE_IDS.sevenDaysLeft },
      3: { key: "reminder_3_days", templateId: BREVO_TEMPLATE_IDS.threeDaysLeft },
      1: { key: "reminder_1_day", templateId: BREVO_TEMPLATE_IDS.oneDayLeft },
    };
    const match = triggerByDay[daysLeft];
    if (!match) return; // not one of the three reminder days

    const leads = await ctx.runQuery(internal.leads.listAll, {});
    for (const lead of leads) {
      if ((lead.sentEmailTriggers ?? []).includes(match.key)) continue;

      await ctx.runAction(internal.brevoClient.sendTemplateEmail, {
        templateId: match.templateId,
        toEmail: lead.email,
        toName: lead.firstName,
        params: { firstName: lead.firstName, daysLeft },
      });
      await ctx.runMutation(internal.leads.markTriggerSent, { leadId: lead._id, triggerKey: match.key });
    }
  },
});

/**
 * Trigger 13 — runs once a day. Only sends during the 7-day training window
 * itself (Aug 24–30, 2026), and only to leads with a paid live_5000 purchase.
 */
export const sendDailyTrainingReminder = internalAction({
  args: {},
  handler: async (ctx) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const dayNumber = Math.floor((Date.now() - TRAINING_START.getTime()) / msPerDay) + 1;
    if (dayNumber < 1 || dayNumber > 7) return; // outside the training window

    const triggerKey = `daily_reminder_day_${dayNumber}`;
    const paidPurchases = await ctx.runQuery(internal.purchases.listPaidByTier, { tier: "live_5000" });

    for (const purchase of paidPurchases) {
      const lead = await ctx.runQuery(api.leads.getByEmail, { email: purchase.leadEmail });
      if (!lead) continue;
      if ((lead.sentEmailTriggers ?? []).includes(triggerKey)) continue;

      await ctx.runAction(internal.brevoClient.sendTemplateEmail, {
        templateId: BREVO_TEMPLATE_IDS.dailyReminder,
        toEmail: lead.email,
        toName: lead.firstName,
        params: { firstName: lead.firstName, dayNumber },
      });
      await ctx.runMutation(internal.leads.markTriggerSent, { leadId: lead._id, triggerKey });
    }
  },
});
