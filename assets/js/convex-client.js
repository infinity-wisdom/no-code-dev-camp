// TODO(backend): replace with your real deployment URL from `npx convex dev`
// (development) or `npx convex deploy` (production) — see README.md.
// This value is meant to be public; it's the same kind of client-safe URL
// as a Supabase project URL or Firebase config, not a secret.
window.NCA_CONVEX_URL = "https://graceful-seahorse-783.convex.cloud";

window.ncaClient = new convex.ConvexClient(window.NCA_CONVEX_URL);

/**
 * Small helpers shared across the four funnel pages so each page's inline
 * script can stay focused on its own logic.
 */
window.nca = {
  /** Read the locally-remembered lead (set at signup on index.html). */
  getLead: function () {
    try {
      return JSON.parse(localStorage.getItem("nca_lead") || "null");
    } catch (e) {
      return null;
    }
  },

  /** Persist the lead's identity so later pages (offers, dashboard) know who this is. */
  setLead: function (lead) {
    localStorage.setItem("nca_lead", JSON.stringify(lead));
  },

  /** Build a shareable referral link that points back at the squeeze page. */
  buildReferralLink: function (email) {
    var base = window.location.origin + window.location.pathname.replace(/[^/]+$/, "index.html");
    return base + "?ref=" + encodeURIComponent(email);
  },
};
