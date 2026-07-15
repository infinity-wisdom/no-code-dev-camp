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

## Backend: Convex

`convex/` holds the backend — schema and functions, deployed as Convex cloud functions:

| File | What it does |
|---|---|
| `convex/schema.ts` | Defines `leads`, `purchases`, and `referrals` tables |
| `convex/leads.ts` | `leads:create` — saves a signup and, if they arrived via `?ref=<email>`, records the referral in the same transaction |
| `convex/purchases.ts` | `purchases:create` (records purchase intent as `"pending"`), `purchases:markPaid` (for a future payment webhook) |
| `convex/referrals.ts` | `referrals:countForEmail`, `referrals:recentForReferrer`, `referrals:leaderboard` — power the dashboard's progress bar, recent-referrals list, and top-10 table in real time |
| `convex/http.ts` | Stub HTTP endpoint for a future payment gateway webhook (not yet verified/wired — see TODO in file) |

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

## Remaining Backend Integration Points

Everything data-related (leads, purchases, referrals, leaderboard) is now live via Convex. What's still a `TODO(backend)` in the code:

- **Payment gateway checkout** (`main-offer.html`, `budget-offer.html`, `dashboard.html`) — buttons currently call `purchases:create` to record intent as `"pending"`, but don't yet open a real Paystack/Flutterwave checkout
- **Payment webhook** (`convex/http.ts`) — stub endpoint exists at `/payments/webhook`, but signature verification and the actual `purchases:markPaid` call still need to be wired to your gateway
- **Transactional emails** (welcome email, purchase receipt) — not yet implemented; would likely be triggered from the payment webhook once it's live

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

