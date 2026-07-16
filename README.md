# CodeCave — NoCode Developers Camp Funnel

Sales funnel for the "7-Day No-Code E-Commerce Bootcamp," backed by [Convex](https://convex.dev). Frontend is static HTML + Tailwind CSS (via CDN) using the **Velocity Blue** design system — see [`DESIGN.md`](./DESIGN.md) for the full color, type, and component spec.

**Logo note:** the CodeCave mark used in the header/footers (`<svg>` icon + "CodeCave" / "NoCode Developers Camp" wordmark) is a placeholder built from scratch — there's no real logo file in this project yet. Swap it for the real one by replacing the inline `<svg>...</svg>` block (search for `TODO(design)` in `index.html`, and the matching markup in the other three files' footers) with an `<img>` tag pointing at your actual logo asset.

## Pages & Funnel Flow

| Page | File | Purpose |
|---|---|---|
| Squeeze page | `index.html` | Hero + roadmap, founder story, "who it's for," FAQ, countdown, and lead-capture form |
| Main offer (₦3,500) | `main-offer.html` | Video recordings + ebook; downsell link to the budget offer |
| Budget offer (₦2,500) | `budget-offer.html` | Recordings-only; the ₦5,000 live-offer button and the "not ready to pay" link both skip straight to the dashboard, no checkout on this page |
| Dashboard | `dashboard.html` | Home base for every signed-up lead, paid or not — countdown, community links, live referral tracker & leaderboard, and the ₦5,000 "Unlock Live Access" checkout |

Every lead who signs up reaches the dashboard, whether or not they've paid for anything — main-offer.html and budget-offer.html both have a "not ready to pay yet? Go to your dashboard" link for exactly that. Payment for any tier (including the ₦5,000 live upgrade) can happen from the dashboard itself via the "Unlock Live Access" button, not just from the offer pages. The **Telegram community card** on the dashboard is the one thing actually gated: it stays locked until `purchases:getPaidTiersForEmail` shows a paid `live_5000` purchase for that lead — WhatsApp, the referral tracker, and the reward unlocks are all available to everyone regardless of payment.

```
index.html  →  main-offer.html  →  dashboard.html  ←  budget-offer.html
                    ↓  (downsell)         ↑ (all paths, paid or not, lead here)
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
| `convex/leads.ts` | `leads:create` — saves a signup and, if they arrived via `?ref=<email>`, records the referral in the same transaction; internal helpers back the IP-recognition routes below |
| `convex/purchases.ts` | `purchases:create` (public — records purchase intent as `"pending"` with a server-generated `txRef` and price); `purchases:getPaidTiersForEmail` (public — powers the Telegram unlock on the dashboard); internal query/mutations used only by verified payment flows |
| `convex/payments.ts` | `payments:verifyTransaction` — called from the browser after Flutterwave's modal reports success; re-checks the transaction server-side against Flutterwave's API before trusting it |
| `convex/referrals.ts` | `referrals:countForEmail`, `referrals:recentForReferrer`, `referrals:leaderboard` — power the dashboard's progress bar, recent-referrals list, and top-10 table in real time |
| `convex/http.ts` | Flutterwave webhook at `/payments/webhook`; `/leads/record-ip` and `/leads/recognize` for the returning-visitor check below |

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

## Returning-Visitor Recognition

Someone who's already signed up shouldn't have to see the squeeze page again. `index.html` checks, in order:

1. **localStorage** (same browser/device) — instant and reliable, this is the primary check.
2. **Hashed-IP match** (different browser/device, same network) — a fallback for when localStorage is empty. On signup, a salted SHA-256 hash of the visitor's IP is recorded against their lead (never the raw IP); on a later visit from an unrecognized browser, that hash is looked up via `GET /leads/recognize`.

If either check succeeds, the visitor is redirected straight to `dashboard.html` before the squeeze page renders.

**Worth knowing:** IP-based matching is a convenience, not a guarantee. Many people share one public IP — offices, campuses, and especially carrier-grade NAT on mobile networks, which is common in Nigeria — so this can occasionally recognize the *wrong* person on the same network as someone who's already signed up. That's why it only returns a first name/email (never anything more sensitive) and only serves as a fallback behind the localStorage check, not the primary mechanism. If this false-positive rate matters for your audience, the simplest fix is to drop the IP fallback and rely on localStorage alone (remove the `recognizeReturningLead()` call in `index.html`).

Requires one more env var:
```bash
npx convex env set IP_HASH_SALT <a-long-random-string>
```

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
- **Telegram invite link** — `dashboard.html` has a placeholder `TELEGRAM_INVITE_LINK`; replace it with your real group/channel invite link once you have one
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

