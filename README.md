# NoCode Academy – 7-Day Bootcamp Funnel

Sales funnel for the "7-Day No-Code E-Commerce Bootcamp," backed by [Convex](https://convex.dev). Frontend is static HTML + Tailwind CSS (via CDN) using the **Velocity Blue** design system — see [`DESIGN.md`](./DESIGN.md) for the full color, type, and component spec.

## Pages & Funnel Flow

| Page | File | Purpose |
|---|---|---|
| Squeeze page | `index.html` | Hero + roadmap, founder story, "who it's for," FAQ, countdown, and lead-capture form |
| Main offer (₦3,500) | `main-offer.html` | Video recordings + ebook; downsell link to the budget offer |
| Budget offer (₦2,500) | `budget-offer.html` | Recordings-only; upsell back toward the ₦5,000 live tier |
| Dashboard | `dashboard.html` | Post-purchase hub — countdown, community links, live referral tracker & leaderboard |

```
index.html  →  main-offer.html  →  dashboard.html
                    ↓  (downsell)        ↑ (upsell)
              budget-offer.html ─────────┘
```

## Motion & Micro-interactions

`assets/js/animations.js` + `assets/css/animations.css` (loaded on every page) add:
- Scroll-reveal on elements marked `data-animate` (optional `data-animate="fade-left"`, `"fade-right"`, or `"pop"`, plus `data-delay="1"`–`"7"` for staggered groups)
- `window.ncaConfetti(element)` — an emoji confetti burst, used on successful signup and reward unlocks
- `data-bounce` — a small press-pop animation for buttons on click

## Backend: Convex

`convex/` holds the backend — schema and functions, deployed as Convex cloud functions:

| File | What it does |
|---|---|
| `convex/schema.ts` | Defines `leads`, `purchases`, and `referrals` tables |
| `convex/pricing.ts` | Canonical tier prices — the source of truth the client can never override |
| `convex/leads.ts` | `leads:create` — saves a signup and, if they arrived via `?ref=<email>`, records the referral in the same transaction |
| `convex/purchases.ts` | `purchases:create` (public — records purchase intent as `"pending"` with a server-generated `txRef` and price); internal query/mutations used only by verified payment flows |
| `convex/payments.ts` | `payments:verifyTransaction` — called from the browser after Flutterwave's modal reports success; re-checks the transaction server-side against Flutterwave's API before trusting it |
| `convex/referrals.ts` | `referrals:countForEmail`, `referrals:recentForReferrer`, `referrals:leaderboard` — power the dashboard's progress bar, recent-referrals list, and top-10 table in real time |
| `convex/http.ts` | Flutterwave webhook at `/payments/webhook` — verifies the request, then re-verifies server-to-server before marking a purchase paid |

The frontend loads Convex via the [script-tag client](https://docs.convex.dev/client/javascript/script-tag) (no bundler needed) — see `assets/js/convex-client.js`, which every page includes.

### One-time setup

```bash
npm install
npx convex dev
```

`npx convex dev` will log you in, create a Convex project, push the functions in `convex/`, and print a **deployment URL** like `https://happy-animal-123.convex.cloud`. Keep this command running while you develop — it live-syncs your `convex/` folder to the cloud.

### Point the frontend at your deployment

Open `assets/js/convex-client.js` and replace the placeholder:

```js
window.NCA_CONVEX_URL = "https://YOUR-DEPLOYMENT-NAME.convex.cloud";
```

This URL is safe to keep in client-side code (same category as a Supabase project URL) — it identifies your deployment but doesn't grant write access beyond what your functions expose.

### Going to production

```bash
npx convex deploy
```

This gives you a **production** deployment URL — swap that into `convex-client.js` before pushing to GitHub Pages.

## Payments: Flutterwave

Checkout uses [Flutterwave's Inline checkout](https://developer.flutterwave.com/v3.0/docs/inline) — their own secure modal (card + bank transfer tabs built in). We never collect raw card numbers ourselves; our custom modal (`assets/js/checkout-modal.js`) only handles order confirmation and payment-method choice, then hands off to Flutterwave's modal for the actual sensitive entry. That keeps this static site out of PCI-DSS scope.

**Flow:** buy button → our modal (confirm order, pick Card or Bank Transfer) → `purchases:create` records a `"pending"` row with a server-generated `txRef` and the canonical price → Flutterwave's modal opens → on completion, the browser calls `payments:verifyTransaction`, which checks the transaction directly against Flutterwave's API (server-side, using your secret key) before ever marking anything `"paid"`. A webhook (`convex/http.ts`) provides a second, independent path to the same verification — needed because bank transfers don't always resolve while the modal is still open.

### One-time setup

1. Create a Flutterwave account and get your **Test** API keys from **Settings → API Keys** in the dashboard.
2. Set your secret key in Convex (never put this in any file):
   ```bash
   npx convex env set FLW_SECRET_KEY FLWSECK_TEST-xxxxxxxxxxxx
   ```
3. Put your **public** key (safe for client-side code) into `assets/js/checkout-modal.js`:
   ```js
   window.NCA_FLW_PUBLIC_KEY = "FLWPUBK_TEST-xxxxxxxxxxxx";
   ```
4. In the Flutterwave dashboard, go to **Settings → Webhooks**, set the webhook URL to:
   ```
   https://<your-deployment-name>.convex.site/payments/webhook
   ```
   (note: `.convex.site`, not `.convex.cloud` — that's the domain Convex uses specifically for HTTP endpoints), and set a secret hash. Then register that same hash in Convex:
   ```bash
   npx convex env set FLW_WEBHOOK_HASH <the-hash-you-set-in-the-dashboard>
   ```
5. Test with Flutterwave's [test cards](https://developer.flutterwave.com/docs/testing-helpers) — e.g. card `4187427415564246`, CVV `828`, expiry `09/32`. Check the Convex dashboard's **Data** tab to confirm the matching `purchases` row flips to `"paid"`.
6. When you're ready for real transactions, switch to your **Live** keys in the dashboard, re-run steps 2–3 with the live values, and re-run `npx convex deploy`.

## Backend Integration Points

Everything data-related (leads, purchases, referrals, leaderboard) and payment processing (Flutterwave checkout + server-side verification + webhook) are now live via Convex. What's still a `TODO(backend)` in the code:

- **Flutterwave public/secret keys and webhook hash** — placeholders until you follow the setup steps above
- **Transactional emails** (welcome email, purchase receipt) — not yet implemented; would likely be triggered from `convex/payments.ts` once a purchase is marked `"paid"`
- **Live/test mode switch** — currently points at whichever Flutterwave keys you've configured; worth double-checking you're on Test keys until you're ready to accept real money

## Hosting on GitHub Pages

1. Push this folder to a GitHub repository (the `convex/_generated` folder is gitignored — each environment regenerates it via `npx convex dev`/`deploy`).
2. In the repo settings, go to **Pages** and set the source to the `main` branch, root folder.
3. Your site will be live at `https://<username>.github.io/<repo-name>/`.

No frontend build step is required — Tailwind, Google Fonts, and the Convex client all load from CDNs at runtime. You do need to have run `npx convex deploy` at least once so `assets/js/convex-client.js` points at a live deployment.

## Local Preview

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Make sure `npx convex dev` is also running in another terminal so the pages have a backend to talk to.

