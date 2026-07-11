# The No-Code Developers Camp — Funnel Frontend

Static front-end for the 4-page funnel described in the Project Blueprint
(Squeeze page → ₦3,500 offer → ₦2,500 budget offer → ₦5,000 dashboard).

## What's in this zip
- `index.html` — Page 1: squeeze landing page with signup form
- `offer.html` — Page 2: Recordings + Ebook (₦3,500), with exit-intent modal
- `budget.html` — Page 3: Videos only (₦2,500) with the ₦5,000 upsell bump
- `dashboard.html` — Page 4: premium dashboard (countdown, community, referrals, leaderboard, guidebook unlocks)
- `css/style.css` — shared design system (sky-blue / dark-blue / red palette, text-based branding)
- `js/main.js` — front-end interactivity

## Important: GitHub Pages is static-only
GitHub Pages can host and serve these HTML/CSS/JS files exactly as they
are — that covers Day 5 of your own curriculum ("Hosting & Going App-Mode").
But the blueprint's IP-hash user identity, payment webhooks (Paystack/
Flutterwave), PostgreSQL/MySQL tables, cron-based milestone emails, and the
`/admin-stats` panel all require a **server that can run code and talk to a
database** — GitHub Pages cannot do this.

Until that backend exists, this frontend uses **`localStorage` as a stand-in**
so every page is fully clickable:
- Signing up on Page 1 creates a local mock "user" (instead of the real
  `IP + User-Agent` hash on your server).
- The dashboard's referral count, leaderboard, and guidebook unlocks are
  **demo values**, not live data.
- The "Pay" buttons link to `#pay` placeholders — wire these to your real
  Paystack/Flutterwave checkout once the backend is live.
- Every spot that needs a real API call is marked `// TODO` in `js/main.js`
  (e.g. `POST /signup`, `GET /leaderboard`, `POST /paystack-webhook`).

**Recommended next step:** deploy the backend (Node/Express or Laravel, per
the blueprint) to a service that runs server code — e.g. Render, Railway, or
Fly.io — then point the TODO fetch calls in `js/main.js` at that API's URL.
GitHub Pages will keep serving the static files for free in the meantime.

## Pushing to GitHub
```bash
cd site
git init
git add .
git commit -m "Initial funnel frontend"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
Then enable GitHub Pages in the repo's **Settings → Pages** and pick the `main`
branch as the source.
