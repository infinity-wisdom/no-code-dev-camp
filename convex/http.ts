import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * TODO(backend): this is a stub. Point your Paystack/Flutterwave webhook at
 * <your-deployment>.convex.site/payments/webhook, then:
 *   1. Verify the request signature using your gateway's signing secret
 *      (store it with `npx convex env set PAYSTACK_SECRET ...` and read via
 *      process.env.PAYSTACK_SECRET here — never hardcode it).
 *   2. Look up the pending purchase (e.g. by a reference you passed at
 *      checkout time) and call purchases.markPaid on success.
 * Until this is wired up, purchases created by the client stay "pending".
 */
http.route({
  path: "/payments/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // const signature = request.headers.get("x-paystack-signature");
    // TODO(backend): verify `signature` against the raw body before trusting it.
    const payload = await request.json();
    console.log("Received payment webhook (not yet verified or processed):", payload);

    return new Response(null, { status: 200 });
  }),
});

export default http;
