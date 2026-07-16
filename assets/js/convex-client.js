// TODO(backend): replace with your real deployment URL from `npx convex dev`
// (development) or `npx convex deploy` (production) — see README.md.
// This value is meant to be public; it's the same kind of client-safe URL
// as a Supabase project URL or Firebase config, not a secret.
window.NCA_CONVEX_URL = "https://YOUR-DEPLOYMENT-NAME.convex.cloud";

// Convex serves HTTP actions (convex/http.ts) from a different domain than
// the WebSocket client — same deployment name, ".convex.site" instead of
// ".convex.cloud". Derived automatically so there's only one URL to configure.
window.NCA_CONVEX_HTTP_URL = window.NCA_CONVEX_URL.replace(".convex.cloud", ".convex.site");

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

  /**
   * Fire-and-forget: tell the backend which IP this lead just signed up
   * from, so a future visit from the same IP (on a different browser/device,
   * where localStorage won't help) can be recognized. Safe to ignore failures —
   * this is a convenience feature, not a critical path.
   */
  recordSignupIp: function (email) {
    fetch(window.NCA_CONVEX_HTTP_URL + "/leads/record-ip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    }).catch(function (err) {
      console.warn("Could not record signup IP (non-critical):", err);
    });
  },

  /**
   * Best-effort "welcome back" check for a new browser/device with no
   * localStorage record. Returns { recognized: false } on any failure so
   * callers can safely fall through to the normal squeeze-page flow.
   */
  recognizeReturningLead: function () {
    return fetch(window.NCA_CONVEX_HTTP_URL + "/leads/recognize")
      .then(function (res) { return res.json(); })
      .catch(function () { return { recognized: false }; });
  },
};
