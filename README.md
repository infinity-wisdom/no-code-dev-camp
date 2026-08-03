# CodeCave — NoCode Developers Camp Funnel

Sales funnel for the "7-Day No-Code E-Commerce Bootcamp," backed by [Convex](https://convex.dev). Frontend is static HTML + Tailwind CSS (via CDN) using the **Velocity Blue** design system — see [`DESIGN.md`](./DESIGN.md) for the full color, type, and component spec.

## ⚠️ Known Issues (as of last code review)

Both issues previously listed here are resolved:

- **The `referrals` table** is now declared in `convex/schema.ts` (`referrerEmail`, `referredEmail`, `referredName`, `createdAt`, indexed `by_referrer`), matching what `convex/leads.ts`, `convex/referrals.ts`, and `convex/emailTriggers.ts` already read/write. Referral signups, the leaderboard, milestone unlocks, and referral-triggered emails all work now.
- **The "Download PDF" buttons** on the dashboard's Unlockable Rewards cards are wired up. `reward-3-download` / `reward-10-download` are now `<a>` tags, and `setRewardState()` takes two additional params (`guideKey`, `leadEmail`) and sets `href` to `window.NCA_CONVEX_HTTP_URL + '/guides/download?key=' + guideKey + '&email=' + encodeURIComponent(leadEmail)` once a reward unlocks.

No other known issues at this time.

## Pages & Funnel Flow

| Page | File | Purpose |
|---|---|---|
| Squeeze page | `index.html` | Hero + roadmap, founder story, "who it's for," FAQ, countdown, and lead-capture form |
| Main offer (₦3,500) | `main-offer.html` | Video recordings + ebook; downsell link to the budget offer |
| Budget offer (₦2,500) | `budget-offer.html` | Recordings-only; the ₦5,000 live-offer button and the "not ready to pay" link both skip straight to the dashboard, no checkout on this page |
| Dashboard | `dashboard.html` | Home base for every signed-up lead, paid or not — dynamic greeting, live countdown, community links, avatar creator, live referral tracker & leaderboard, and the ₦5,000 "Unlock Live Access" checkout |

Every lead who signs up reaches the dashboard, whether or not they've paid for anything — main-offer.html and budget-offer.html both have a "not ready to pay yet? Go to your dashboard" link for exactly that. Payment for any tier (including the ₦5,000 live upgrade) can happen from the dashboard itself via the "Unlock Live Access" button, not just from the offer pages. The **Telegram community card** on the dashboard is the one thing actually gated: it stays locked until `purchases:getPaidTiersForEmail` shows a paid `live_5000` purchase for that lead — WhatsApp, the referral tracker, and the reward unlocks are all available to everyone regardless of payment.

```
index.html  →  main-offer.html  →  dashboard.html  ←  budget-offer.html
                    ↓  (downsell)         ↑ (all paths, paid or not, lead here)
              budget-offer.html ─────────┘
```

## Dashboard Details

- **Greeting** — `dashboard.html` pulls the lead's first name from `localStorage` (`window.nca.getLead()`) and sets "Welcome back, [First Name]!"; guests with no stored lead see a generic "Welcome back!" instead.
- **Countdown** — a real live countdown to Aug 24, 2026 (same target date as the one on `index.html`), not a decorative animation.
- **Hero background** — an original abstract pattern (dot grid + gradient blobs + floating code glyphs), built from scratch rather than a stock photo — embedding a photo we don't hold the rights to into a production site would be a copyright risk.
- **₦5,000 CTA** — bigger, with a pulsing glow ring (`.nca-glow-ring` in `animations.css`) and a "🔥 Most Popular Upgrade" badge above it.
- **Other Offers section** — two cards (₦2,500 and ₦3,500) let a lead buy either tier straight from the dashboard, using the same checkout modal as `main-offer.html`/`budget-offer.html`. Each button checks `purchases:getPaidTiersForEmail` and shows "✅ Purchased" (disabled) if that tier's already paid for.
- **Community cards** — WhatsApp and Telegram links are live, each with the real brand icon (inline SVG, not generic Material icons). Telegram unlocks (with a confetti burst) only once `purchases:getPaidTiersForEmail` shows a paid `live_5000` purchase.
- **Instructor socials** — LinkedIn, X, YouTube, and a personal profile link, each labeled with its real brand icon.
- **Avatar creator** — uploads a photo and composites it directly into the official camp flyer (`assets/images/avatar-flyer-template.png`), clipped into the flyer's circular photo slot and re-framed with its ring, then downloadable as the full poster. Entirely client-side (`assets/js/avatar-creator.js`) — the photo is read via `FileReader` and drawn straight to `<canvas>`; it's never uploaded to Convex or anywhere else. If that template artwork is ever replaced with a redesigned flyer, the circle's center/radius constants at the top of `avatar-creator.js` need to be re-measured to match.
- **Unlockable rewards** — the 3-invite and 10-invite rewards are named "Prep Guide eBook 1 (AI Prompt Engineering & Training Deliverables)" and "Prep Guide eBook 2 (Backend Hosting, APIs & Cheat Sheets)", and are real, server-gated PDF downloads — see **Gated Downloads** below. Note: the Brevo email templates for triggers #3/#4 (see Email Automation below) were written before this rename and may still reference the old names — worth checking if you've already built those templates in Brevo.

`main-offer.html`'s intro video (`data-youtube-id="-xllgHz-cmo"` on `#intro-video-container`) autoplays and loops continuously — muted, since browsers block unmuted autoplay outright and there's no way around that. It's a directly-created `<iframe>` with `autoplay=1&mute=1&loop=1&playlist=<same id>` (YouTube's documented way to loop a single video), built by the inline script at the bottom of the file. There's currently no unmute control — the video is silent for the full page visit. To swap in a different video, change the `data-youtube-id` value; no other code needs to change.

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
| `convex/http.ts` | Flutterwave webhook at `/payments/webhook`; `/leads/record-ip` and `/leads/recognize` for the returning-visitor check below; `/guides/download` for the gated prep guide PDFs |
| `convex/guideFiles.ts` | Manages the two gated PDFs in Convex File Storage — upload plumbing (admin-secret gated) and the lookup used by the download route |
| `convex/emailTemplates.ts` | Brevo template ID config and sender identity — the one file to edit when wiring in real templates |
| `convex/brevoClient.ts` | The single function that actually calls Brevo's API; everything else just calls this |
| `convex/emailTriggers.ts` | Triggers 1–9 — signup, referral milestones, leaderboard rank, payment confirmations |
| `convex/reminders.ts` + `convex/crons.ts` | Triggers 10–13 — the daily countdown and training-window reminders |

The frontend loads Convex via the [script-tag client](https://docs.convex.dev/client/javascript/script-tag) (no bundler needed) — see `assets/js/convex-client.js`, which every page includes.

### One-time setup

```bash
npm install
npx convex dev
```

`npx convex dev` will log you in, create a Convex project, push the functions in `convex/`, and print a **deployment URL** like `https://happy-animal-123.convex.cloud`. Keep this command running while you develop — it live-syncs your `convex/` folder to the cloud.

### Point the frontend at your deployment

`assets/js/convex-client.js` already has a real deployment URL set, not the placeholder:

```js
window.NCA_CONVEX_URL = "https://graceful-seahorse-783.convex.cloud";
```

This URL is safe to keep in client-side code (same category as a Supabase project URL) — it identifies your deployment but doesn't grant write access beyond what your functions expose. If you ever create a new Convex project, this is the line to update.

### Going to production

```bash
npx convex deploy
```

This gives you a **production** deployment URL, separate from the dev one above — swap that into `convex-client.js` before your production frontend deploy goes live (see **Hosting** below — this site currently deploys via Vercel, not GitHub Pages).

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

## Gated Downloads: Prep Guide PDFs

**Status: fully wired end-to-end.** The dashboard's download links now point at the gated route once a reward unlocks (frontend), and the backend gate itself works correctly.

The 3-referral and 10-referral rewards ("Prep Guide eBook 1" and "eBook 2") are real, server-gated downloads — not just a UI-hidden link to a static file. The PDFs live in **Convex File Storage**, not in this repo or any public web path, and `convex/http.ts`'s `/guides/download` route re-checks the requester's actual referral count (against the same `referrals` table Convex already trusts) before ever returning the file bytes. Knowing or guessing the download URL isn't enough — the count has to genuinely be there.

This intentionally isn't a full auth system — there's no login on this site, so email is the only identity signal available, and someone who knows another lead's exact email could download on their behalf. That's an acceptable tradeoff for two bonus PDFs; don't reuse this pattern as-is for anything more sensitive.

### One-time setup

1. Set an admin secret — this is what stops a random visitor from calling the upload mutations themselves (they're public functions, since the upload script needs to call them from outside Convex, which internal-only functions can't be called from):
   ```bash
   npx convex env set ADMIN_UPLOAD_SECRET <a-long-random-string>
   ```
2. Set the same value in your local shell before running the script:
   ```bash
   export ADMIN_UPLOAD_SECRET=<the-same-string>          # macOS/Linux
   $env:ADMIN_UPLOAD_SECRET = "<the-same-string>"          # Windows PowerShell
   ```
3. Place the two PDFs in the project root as `prep-guide-1.pdf` and `prep-guide-2.pdf` — **these are gitignored on purpose** (see `.gitignore`) and must never be committed; the only copy that should exist after setup is the one inside Convex File Storage.
4. Run:
   ```bash
   node scripts/upload-guides.js
   ```
   This uploads both files and records their Convex Storage IDs in the `fileAssets` table. Re-run any time you want to replace either file — it overwrites the previous upload rather than duplicating it.
5. Once uploaded, you can delete the local `prep-guide-*.pdf` files — the dashboard's download links pull directly from Convex Storage via the gate, not from anything local.

## Payments: Flutterwave

**Status: test keys are already wired in** — `assets/js/checkout-modal.js` has a real `FLWPUBK_TEST-...` key set (not the placeholder), and this has been tested working end-to-end per earlier debugging in this project. Going live means switching to Flutterwave's live keys (in Convex for the secret key, in `checkout-modal.js` for the public one), pointing the webhook at a production Convex deployment, and completing Flutterwave's business verification — none of that has been done yet.

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

## Email Automation: Brevo

**Status: all 13 template IDs are filled in** in `convex/emailTemplates.ts` (no longer placeholder `0`s) — sending is fully configured. Triggers 2–6 depend on the `referrals` table, which is now declared in the schema, so all 13 triggers fire correctly.

All 13 triggers are implemented in Convex and send through Brevo's transactional email API. Nothing here needs a separate scheduler service — Convex's own cron jobs handle the time-based ones.

| # | Trigger | File | Mechanism |
|---|---|---|---|
| 1 | Signup | `convex/emailTriggers.ts` (`afterLeadCreated`) | Scheduled from `leads:create` |
| 2–4 | 1st / 3rd / 10th referral | `convex/emailTriggers.ts` (`afterReferralInserted`) | Exact-count check — counts only increase by 1, so this fires once per threshold with no extra flag needed |
| 5–6 | First top-10 / top-3 | `convex/emailTriggers.ts` (`afterReferralInserted`) | Recomputes the full leaderboard in the same transaction as each new referral; guarded by a persisted flag since rank can move both directions |
| 7–9 | Paid ₦2,500 / ₦3,500 / ₦5,000 | `convex/emailTriggers.ts` (`afterPurchasePaid`) | Scheduled from `purchases:markPaidById`, which is already idempotent |
| 10–12 | 7 / 3 / 1 days to training | `convex/reminders.ts` + `convex/crons.ts` | Daily cron; internally checks the exact day-offset against `TRAINING_START` |
| 13 | Daily training reminder (₦5,000 buyers) | `convex/reminders.ts` + `convex/crons.ts` | Separate daily cron, active only during the 7-day training window, filtered to paid `live_5000` purchases |

**Idempotency:** every one-time trigger (1–6, 10–13) is guarded so retries or re-runs never double-send. Triggers 1 and 10–13 use a `sentEmailTriggers: string[]` field on each lead (see `convex/schema.ts`) — checked and updated in the same mutation/action that sends. Triggers 2–4 rely on referral counts only ever increasing by exactly one, so an exact-equality check is naturally idempotent without needing a flag. Triggers 7–9 ride on `purchases:markPaidById`'s existing `status === "paid"` guard.

**All Brevo API calls go through one function** — `convex/brevoClient.ts`'s `sendTemplateEmail` — rather than being duplicated across every trigger. Every other file just calls it with a template ID and params.

### One-time setup

1. Set your Brevo API key:
   ```bash
   npx convex env set BREVO_API_KEY xkeysib-xxxxxxxxxxxx
   ```
2. `convex/emailTemplates.ts` already has all 13 real Template IDs filled in — only revisit this file if you rebuild a template in Brevo and get a new ID, or add a 14th trigger later.
3. Confirm `BREVO_SENDER` in the same file matches the sender you created against your verified domain.
4. Deploy — cron jobs activate automatically once pushed; no separate registration step:
   ```bash
   npx convex deploy
   ```

## Backend Integration Points

Most of what used to be placeholders here are now filled in with real values. What's actually still outstanding:

- **Flutterwave secret key and webhook hash** — these are Convex env vars, not visible in the code, so their status can't be confirmed by reading files; the public key in `assets/js/checkout-modal.js` is a real Test key, which suggests the others were likely set too, but worth double-checking with `npx convex env list` if payments aren't confirming correctly
- **Live/test mode switch** — currently on Flutterwave **Test** keys per `checkout-modal.js`; this needs to change deliberately before accepting real payments, along with the corresponding secret key and webhook hash

Already resolved, despite older notes in this README previously flagging them: the CodeCave logo is real (not a placeholder), the Telegram invite link is set, all 13 Brevo template IDs are filled in, the `referrals` table is declared in the schema, and the gated download buttons are wired to the download URL.

## Hosting: Vercel

This site is deployed via **Vercel**, connected directly to this GitHub repo (not GitHub Pages, despite what earlier notes in this README used to say) — currently live at `ncdc.codecave.com.ng` (a subdomain of a `.com.ng` domain, DNS managed through a NiRA-accredited registrar).

Since it's connected to GitHub, every push to `main` triggers an automatic redeploy — no manual upload step. To set this up fresh on a new Vercel project:

1. Import this repo in the Vercel dashboard (**Add New → Project**, select from your connected GitHub account)
2. No build configuration needed — this is plain static HTML/CSS/JS with no bundler, so Vercel's default settings (or "Other" framework preset) work fine
3. Add your custom domain/subdomain under **Project → Settings → Domains**, and point its DNS at Vercel per the records shown there

No frontend build step is required either way — Tailwind, Google Fonts, and the Convex client all load from CDNs at runtime. You do need `npx convex deploy` run at least once so `assets/js/convex-client.js` points at a live deployment before real traffic hits the site.

## Local Preview

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Make sure `npx convex dev` is also running in another terminal so the pages have a backend to talk to.

