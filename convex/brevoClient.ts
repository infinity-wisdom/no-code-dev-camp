import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { BREVO_SENDER } from "./emailTemplates";

/**
 * Sends one transactional email via Brevo. This is deliberately the only
 * function in the whole project that talks to Brevo's API — every trigger
 * elsewhere calls this with a template ID and params, rather than
 * duplicating fetch/auth logic in a dozen places.
 *
 * TODO(backend): set your Brevo API key once:
 *   npx convex env set BREVO_API_KEY xkeysib-xxxxxxxxxxxx
 */
export const sendTemplateEmail = internalAction({
  args: {
    templateId: v.number(),
    toEmail: v.string(),
    toName: v.optional(v.string()),
    params: v.optional(v.record(v.string(), v.union(v.string(), v.number()))),
  },
  handler: async (ctx, args) => {
    if (!args.templateId) {
      // Template not configured yet in convex/emailTemplates.ts — skip
      // quietly rather than failing the mutation/cron that triggered this.
      console.warn(`Skipped email to ${args.toEmail}: no Brevo template ID configured for this trigger yet.`);
      return;
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error("BREVO_API_KEY is not set. Run `npx convex env set BREVO_API_KEY <your-api-key>`.");
      return;
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: BREVO_SENDER,
        to: [{ email: args.toEmail, name: args.toName }],
        templateId: args.templateId,
        params: args.params ?? {},
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Brevo send failed (template ${args.templateId} to ${args.toEmail}): ${res.status} ${text}`);
    }
  },
});
