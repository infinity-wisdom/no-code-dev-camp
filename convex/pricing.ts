export const CURRENCY = "NGN";

export const TIER_PRICING: Record<"budget_2500" | "main_3500" | "live_5000", number> = {
  budget_2500: 2500,
  main_3500: 3500,
  live_5000: 5000,
};

export const TIER_LABELS: Record<"budget_2500" | "main_3500" | "live_5000", string> = {
  budget_2500: "Budget Offer — Recordings Only",
  main_3500: "Main Offer — Recordings + Ebook",
  live_5000: "Live Access Upgrade",
};
