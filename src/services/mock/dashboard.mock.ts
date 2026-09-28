import type { CampaignSummary, DashboardRange, PeriodValue, RevenuePoint } from "@/types/dashboard";

const now = Date.now();
const DAY_MS = 24 * 60 * 60_000;
const daysFromNow = (days: number) => new Date(now + days * DAY_MS).toISOString();

export const MOCK_PERIOD_KPIS: Record<DashboardRange, { activeCampaigns: PeriodValue; previousRevenue: number }> = {
  "7d": { activeCampaigns: { current: 37, previous: 34 }, previousRevenue: 1_080_000 },
  "30d": { activeCampaigns: { current: 37, previous: 31 }, previousRevenue: 4_430_000 },
  "90d": { activeCampaigns: { current: 37, previous: 40 }, previousRevenue: 11_750_000 },
};

// Escrow payments whose release date has passed without the brand approving delivery.
export const MOCK_OVERDUE_PAYMENTS = 4;

function labelDay(daysAgo: number) {
  return new Date(now - daysAgo * DAY_MS).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Platform fees per day (7d, 30d) or per week (90d), oldest first.
const DAILY_7 = [150_000, 190_000, 165_000, 210_000, 180_000, 175_000, 170_000];
const DAILY_30 = [
  120_000, 140_000, 135_000, 160_000, 150_000, 110_000, 95_000, 145_000, 170_000, 165_000, 175_000, 160_000, 130_000, 120_000,
  165_000, 180_000, 190_000, 175_000, 185_000, 150_000, 140_000, 175_000, 195_000, 210_000, 200_000, 190_000, 160_000, 150_000,
  180_000, 170_000,
];
const WEEKLY_13 = [820_000, 870_000, 910_000, 880_000, 960_000, 1_020_000, 990_000, 1_080_000, 1_150_000, 1_110_000, 1_190_000, 1_250_000, 1_240_000];

export const MOCK_REVENUE: Record<DashboardRange, RevenuePoint[]> = {
  "7d": DAILY_7.map((revenue, i) => ({ label: labelDay(DAILY_7.length - 1 - i), revenue })),
  "30d": DAILY_30.map((revenue, i) => ({ label: labelDay(DAILY_30.length - 1 - i), revenue })),
  "90d": WEEKLY_13.map((revenue, i) => ({ label: labelDay((WEEKLY_13.length - 1 - i) * 7), revenue })),
};

export const MOCK_CAMPAIGNS: CampaignSummary[] = [
  { id: "c-201", name: "Autumn Glow Launch", brand: "Shea Radiance", budget: 2_400_000, influencers: 14, delivered: 9, endsAt: daysFromNow(6), status: "in-progress" },
  { id: "c-202", name: "Summer Cashback", brand: "PayLink Mobile", budget: 3_100_000, influencers: 6, delivered: 6, endsAt: daysFromNow(-2), status: "pending-review" },
  { id: "c-203", name: "Zanzibar Escape", brand: "Wanderlust Tours", budget: 900_000, influencers: 4, delivered: 1, endsAt: daysFromNow(-3), status: "overdue" },
  { id: "c-204", name: "Morning Ritual", brand: "Kivu Coffee Co.", budget: 650_000, influencers: 5, delivered: 0, endsAt: daysFromNow(21), status: "scheduled" },
  { id: "c-205", name: "Back to School", brand: "PayLink Mobile", budget: 1_800_000, influencers: 21, delivered: 21, endsAt: daysFromNow(-9), status: "completed" },
];
