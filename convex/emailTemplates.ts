/**
 * TODO(backend): replace every 0 below with the real Brevo Template ID shown
 * in Brevo's dashboard (Campaigns → Templates → Transactional) once you've
 * created each one. This is the only file that needs editing to wire in
 * real templates — nothing else in convex/ references template numbers directly.
 *
 * Until a given ID is set (left as 0), convex/brevoClient.ts will skip
 * sending that email and log a warning instead of failing — so the rest of
 * the app keeps working normally while templates are still being built out.
 */
export const BREVO_TEMPLATE_IDS = {
  welcome: 1, // Trigger 1  — signup
  firstReferral: 2, // Trigger 2  — first referral
  threeReferrals: 3, // Trigger 3  — 3 referrals
  tenReferrals: 5, // Trigger 4  — 10 referrals
  firstTop10: 4, // Trigger 5  — first time ranked top 10
  firstTop3: 6, // Trigger 6  — first time ranked top 3
  paidBudget: 7, // Trigger 7  — paid ₦2,500
  paidMain: 8, // Trigger 8  — paid ₦3,500
  paidLive: 9, // Trigger 9  — paid ₦5,000
  sevenDaysLeft: 10, // Trigger 10 — 7 days to training
  threeDaysLeft: 11, // Trigger 11 — 3 days to training
  oneDayLeft: 12, // Trigger 12 — 1 day to training
  dailyReminder: 13, // Trigger 13 — daily reminder during training (live_5000 buyers only)
} as const;

// TODO(backend): confirm this matches the sender you created in Brevo
// against your verified ncdc.codecave.com.ng domain.
export const BREVO_SENDER = {
  email: "hello@ncdc.codecave.com.ng",
  name: "CodeCave — NoCode Developers Camp",
};

// Training start date, shared with the countdown on index.html/dashboard.html.
export const TRAINING_START = new Date("2026-08-24T00:00:00Z");
