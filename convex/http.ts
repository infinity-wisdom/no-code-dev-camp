import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Flutterwave webhook. Point this at:
 *   https://<your-deployment-name>.convex.site/payments/webhook
 * (note: .convex.site, not .convex.cloud — that's the domain Convex uses for
 * HTTP actions specifically)
 *
 * Set this up in the Flutterwave dashboard under Settings > Webhooks, and
 * put the same secret hash you configure there into Convex:
 *   npx convex env set FLW_WEBHOOK_HASH <the-secret-hash-you-set-in-the-dashboard>
 *
 * Flutterwave's webhook auth is a simple string comparison against a header
 * (not HMAC) — see convex/payments.ts for the full server-side verification
 * against Flutterwave's API, which this endpoint also performs before
 * trusting anything in the payload.
 *
 * This is the source of truth for marking a purchase "paid" — bank transfers
 * and some other methods don't resolve instantly, so this webhook may be the
 * *only* thing that confirms them (the client-side callback in main-offer.html
 * etc. only fires for methods that complete while the modal is still open).
 */
http.route({
  path: "/payments/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedHash = process.env.FLW_WEBHOOK_HASH;
    const receivedHash = request.headers.get("verif-hash");

    if (!expectedHash || !receivedHash || receivedHash !== expectedHash) {
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = await request.json();
    const txRef = payload?.data?.tx_ref;
    const transactionId = payload?.data?.id;

    if (payload?.status !== "successful" || !txRef || !transactionId) {
      // Not a successful-payment event (could be a failed/cancelled attempt) — nothing to do.
      return new Response(null, { status: 200 });
    }

    // Re-verify server-to-server against Flutterwave's API rather than
    // trusting the webhook payload's own "successful" claim at face value.
    await ctx.runAction(internal.payments.verifyAndMarkPaidByTxRef, {
      txRef,
      transactionId: String(transactionId),
    });

    return new Response(null, { status: 200 });
  }),
});

export default http;
