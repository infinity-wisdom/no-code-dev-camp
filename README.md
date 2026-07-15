# NoCode Academy – 7-Day Bootcamp Funnel

Static sales funnel for the "7-Day No-Code E-Commerce Bootcamp." Built with Tailwind CSS (via CDN) and the **Velocity Blue** design system — see [`DESIGN.md`](./DESIGN.md) for the full color, type, and component spec.

## Pages & Funnel Flow

| Page | File | Purpose |
|---|---|---|
| Squeeze page | `index.html` | Hero + roadmap, founder story, "who it's for," FAQ, and lead-capture form |
| Main offer (₦3,500) | `main-offer.html` | Video recordings + ebook; downsell link to the budget offer |
| Budget offer (₦2,500) | `budget-offer.html` | Recordings-only; upsell back toward the ₦5,000 live tier |
| Dashboard | `dashboard.html` | Post-purchase hub — countdown, community links, referral tracker |

```
index.html  →  main-offer.html  →  dashboard.html
                    ↓  (downsell)        ↑ (upsell)
              budget-offer.html ─────────┘
```

## Backend Integration Points

This is a **frontend-only** build. All lead capture, purchases, and referral tracking currently run on `localStorage`/in-memory placeholders so the funnel can be demoed end-to-end before a backend exists. Every placeholder is marked with a `TODO(backend)` comment in the HTML, covering:

- Lead form submission (`index.html`) → wire to your email/CRM provider (e.g. Mailchimp) or your own API
- Checkout buttons (`main-offer.html`, `budget-offer.html`, `dashboard.html`) → wire to a payment gateway (e.g. Paystack, Flutterwave)
- Referral link + code (`dashboard.html`) → generate a real per-user code and track referrals server-side

## Hosting on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo settings, go to **Pages** and set the source to the `main` branch, root folder.
3. Your site will be live at `https://<username>.github.io/<repo-name>/`.

No build step is required — all styling is loaded from the Tailwind CDN and Google Fonts at runtime.

## Local Preview

Just open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
