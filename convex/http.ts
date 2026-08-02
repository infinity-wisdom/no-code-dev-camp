import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { GUIDE_REQUIREMENTS } from "./guideFiles";

const http = httpRouter();

// Allow the static site (GitHub Pages, localhost, etc.) to call the two
// browser-facing routes below. Restrict this to your real domain once you
// know it, e.g. "https://yourname.github.io".
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(body: BodyInit | null, init: ResponseInit = {}) {
  return new Response(body, {
    ...init,
    headers: { ...(init.headers || {}), ...CORS_HEADERS },
  });
}

/**
 * Salted SHA-256 hash of an IP address. We never store the raw IP — only
 * this hash — and the salt (kept server-side only, in an env var) means
 * someone with just database access can't cheaply brute-force it back to
 * an IP the way they could with an unsalted hash (IPv4 space is only ~4
 * billion values, small enough to precompute a rainbow table for).
 *
 * TODO(backend): set a random salt once — never reuse a public value:
 *   npx convex env set IP_HASH_SALT <a-long-random-string>
 */
async function hashIp(ip: string): Promise<string | null> {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) return null;
  const data = new TextEncoder().encode(salt + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Best-effort real client IP. X-Forwarded-For can be spoofed by the client
 * for the leftmost entry, and this is only ever used as a soft "welcome
 * back" convenience signal — never for anything security-sensitive — so
 * that's an acceptable tradeoff here.
 */
function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return null;
}

/**
 * Called once, right after a successful signup (see index.html), so we can
 * associate the lead with a hash of the IP they signed up from. The
 * WebSocket-based `leads:create` mutation never sees the real request IP —
 * only an HTTP action does — hence this second, follow-up call.
 */
http.route({
  path: "/leads/record-ip",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { email } = await request.json();
    if (!email) return withCors(null, { status: 400 });

    const ip = getClientIp(request);
    const ipHash = ip ? await hashIp(ip) : null;
    if (ipHash) {
      await ctx.runMutation(internal.leads.setIpHashForEmail, { email, ipHash });
    }
    return withCors(null, { status: 200 });
  }),
});

http.route({
  path: "/leads/record-ip",
  method: "OPTIONS",
  handler: httpAction(async () => withCors(null, { status: 204 })),
});

/**
 * Called from index.html on page load, before showing the squeeze page, to
 * check "have we seen this IP sign up before?" This is a best-effort
 * convenience for returning visitors on a new browser/device — the primary,
 * reliable check is the localStorage record set at signup, which this only
 * supplements. Shared IPs (offices, campuses, and especially carrier-grade
 * NAT on mobile networks) mean this can occasionally recognize the wrong
 * person; it deliberately only returns a first name and email, never
 * anything more sensitive, to keep a false match low-stakes.
 */
http.route({
  path: "/leads/recognize",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const ip = getClientIp(request);
    if (!ip) return withCors(JSON.stringify({ recognized: false }), { status: 200 });

    const ipHash = await hashIp(ip);
    if (!ipHash) return withCors(JSON.stringify({ recognized: false }), { status: 200 });

    const lead = await ctx.runQuery(internal.leads.getByIpHash, { ipHash });
    if (!lead) return withCors(JSON.stringify({ recognized: false }), { status: 200 });

    return withCors(
      JSON.stringify({
        recognized: true,
        lead: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone },
      }),
      { status: 200 },
    );
  }),
});

http.route({
  path: "/leads/recognize",
  method: "OPTIONS",
  handler: httpAction(async () => withCors(null, { status: 204 })),
});

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

/**
 * The real gate for the two referral-unlocked prep guides. Unlike the old
 * approach (a static file in the repo, with the dashboard just hiding the
 * download button until enough referrals), this re-checks the referral
 * count server-side, against the same `referrals` table Convex already
 * trusts — a client can't get the file bytes just by knowing the URL or
 * editing the page's HTML/JS.
 *
 * Called as: GET /guides/download?key=guide_1&email=someone@example.com
 *
 * This is intentionally NOT stronger than "know a real, unlocked lead's
 * email" — there's no login system on this site, so email is the only
 * identity signal available. That's an acceptable tradeoff for two bonus
 * PDFs; it is not the right pattern to copy for anything actually
 * sensitive.
 */
http.route({
  path: "/guides/download",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const email = url.searchParams.get("email");

    if (key !== "guide_1" && key !== "guide_2") {
      return withCors("Unknown guide key.", { status: 400 });
    }
    if (!email) {
      return withCors("Missing email.", { status: 400 });
    }

    const referralCount = await ctx.runQuery(api.referrals.countForEmail, { email });
    const required = GUIDE_REQUIREMENTS[key];

    if (referralCount < required) {
      return withCors(
        `Not unlocked yet — this guide requires ${required} referrals (you have ${referralCount}).`,
        { status: 403 },
      );
    }

    const storageId = await ctx.runQuery(internal.guideFiles.getGuideStorageId, { key });
    if (!storageId) {
      // Eligible, but the file hasn't been uploaded yet (see scripts/upload-guides.js).
      return withCors("This guide isn't available for download yet — check back soon.", { status: 503 });
    }

    const blob = await ctx.storage.get(storageId);
    if (!blob) {
      return withCors("File not found.", { status: 404 });
    }

    const filename = key === "guide_1" ? "prep-guide-1-ai-prompt-engineering.pdf" : "prep-guide-2-backend-hosting-apis.pdf";

    return new Response(blob, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }),
});

http.route({
  path: "/guides/download",
  method: "OPTIONS",
  handler: httpAction(async () => withCors(null, { status: 204 })),
});

export default http;
