import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Called from the browser right after Flutterwave's checkout modal reports
 * success (its `callback`). We never trust that report on its own — a
 * tampered client could claim success without paying. Instead we take the
 * transaction_id it hands us and ask Flutterwave directly whether that
 * transaction really settled, for the amount/currency/txRef we expect.
 *
 * TODO(backend): set your secret key once, from a terminal (never commit it):
 *   npx convex env set FLW_SECRET_KEY FLWSECK-xxxxxxxxxxxx
 */
export const verifyTransaction = action({
  args: {
    transactionId: v.string(),
    purchaseId: v.id("purchases"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; reason?: string }> => {
    const secretKey = process.env.FLW_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "FLW_SECRET_KEY is not set. Run `npx convex env set FLW_SECRET_KEY <your-secret-key>` (find it in the Flutterwave dashboard under Settings > API Keys).",
      );
    }

    const purchase = await ctx.runQuery(internal.purchases.getById, { purchaseId: args.purchaseId });
    if (!purchase) return { success: false, reason: "purchase_not_found" };
    if (purchase.status === "paid") return { success: true }; // already verified, idempotent

    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/${args.transactionId}/verify`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    if (!res.ok) {
      return { success: false, reason: "verify_request_failed" };
    }

    const json = await res.json();
    const data = json?.data;

    const isValid =
      json?.status === "success" &&
      data?.status === "successful" &&
      data?.tx_ref === purchase.txRef &&
      data?.currency === purchase.currency &&
      // Flutterwave settlement can exceed the charged amount due to fees
      // passed to the customer, so this must be >=, never a strict equality.
      Number(data?.amount) >= purchase.amount;

    if (isValid) {
      await ctx.runMutation(internal.purchases.markPaidById, {
        purchaseId: args.purchaseId,
        flwTransactionId: String(data.id),
      });
      return { success: true };
    }

    await ctx.runMutation(internal.purchases.markFailedById, { purchaseId: args.purchaseId });
    return { success: false, reason: "verification_mismatch" };
  },
});

/**
 * Same verification logic, used by the webhook (convex/http.ts) instead of
 * the browser-triggered action above. Kept internal since it's only ever
 * invoked server-to-server.
 */
export const verifyAndMarkPaidByTxRef = internalAction({
  args: { txRef: v.string(), transactionId: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; reason?: string }> => {
    const secretKey = process.env.FLW_SECRET_KEY;
    if (!secretKey) return { success: false, reason: "missing_secret_key" };

    const purchase = await ctx.runQuery(internal.purchases.getByTxRef, { txRef: args.txRef });
    if (!purchase) return { success: false, reason: "purchase_not_found" };
    if (purchase.status === "paid") return { success: true };

    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/${args.transactionId}/verify`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    if (!res.ok) return { success: false, reason: "verify_request_failed" };

    const json = await res.json();
    const data = json?.data;
    const isValid =
      json?.status === "success" &&
      data?.status === "successful" &&
      data?.tx_ref === purchase.txRef &&
      data?.currency === purchase.currency &&
      Number(data?.amount) >= purchase.amount;

    if (isValid) {
      await ctx.runMutation(internal.purchases.markPaidById, {
        purchaseId: purchase._id,
        flwTransactionId: String(data.id),
      });
      return { success: true };
    }

    await ctx.runMutation(internal.purchases.markFailedById, { purchaseId: purchase._id });
    return { success: false, reason: "verification_mismatch" };
  },
});
