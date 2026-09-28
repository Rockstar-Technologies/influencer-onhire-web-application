import type { DeliveryReport, EscrowPayment, MonthlyPaymentStat, Withdrawal } from "@/types/payments";

// Timestamps are relative to server start so "3 days ago" stays believable in dev.
const now = Date.now();
const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60_000).toISOString();

const SHEA = { id: "u-107", name: "Shea Radiance" };
const PAYLINK = { id: "u-109", name: "PayLink Mobile" };
const WANDERLUST = { id: "u-110", name: "Wanderlust Tours" };
const AMARA = { id: "u-101", name: "Amara Nkemelu" };
const JAMES = { id: "u-102", name: "James Mwangi" };
const MURIEL = { id: "u-105", name: "Muriel Blanch" };
const TARIQ = { id: "u-106", name: "Tariq Bello" };

// In-memory stand-in for the escrow_payments table. Funding, cashout requests and releases mutate it.
export const MOCK_PAYMENTS: EscrowPayment[] = [
  { id: "p-2054", invoice: "INV-2054", campaign: "Glow Routine Reels", brand: SHEA, creator: JAMES, gross: 1_200_000, method: "Orange Money", status: "held", fundedAt: daysAgo(1) },
  { id: "p-2051", invoice: "INV-2051", campaign: "Autumn Glow Launch", brand: SHEA, creator: AMARA, gross: 2_400_000, method: "MTN MoMo", status: "held", fundedAt: daysAgo(2) },
  {
    id: "p-2052", invoice: "INV-2052", campaign: "Autumn Glow Launch", brand: SHEA, creator: MURIEL, gross: 1_800_000, method: "Orange Money", status: "requested", fundedAt: daysAgo(12), requestedAt: daysAgo(1),
    report: report("Posted 2 reels and 4 stories showing the Autumn Glow serum routine. 212K views, 9.4% engagement.", ["https://instagram.com/reel/autumn-glow-1", "https://instagram.com/reel/autumn-glow-2"], daysAgo(1)),
  },
  {
    id: "p-2047", invoice: "INV-2047", campaign: "Summer Cashback", brand: PAYLINK, creator: JAMES, gross: 1_850_000, method: "MTN MoMo", status: "requested", fundedAt: daysAgo(15), requestedAt: daysAgo(5),
    report: report("Published the cashback explainer video and 3 follow-up posts with the referral code. 1,140 sign-ups tracked.", ["https://tiktok.com/@jamesmwangi/video/cashback"], daysAgo(5)),
  },
  {
    id: "p-2046", invoice: "INV-2046", campaign: "Summer Cashback", brand: PAYLINK, creator: AMARA, gross: 1_600_000, method: "MTN MoMo", status: "requested", fundedAt: daysAgo(15), requestedAt: daysAgo(2),
    report: report("Two outfit posts featuring the PayLink card at checkout, plus a story Q&A. 96K reach.", ["https://instagram.com/p/paylink-style"], daysAgo(2)),
  },
  { id: "p-2049", invoice: "INV-2049", campaign: "Zanzibar Escape", brand: WANDERLUST, creator: TARIQ, gross: 900_000, method: "MTN MoMo", status: "held", fundedAt: daysAgo(20) },
  {
    id: "p-2043", invoice: "INV-2043", campaign: "Back to School", brand: PAYLINK, creator: MURIEL, gross: 2_900_000, method: "Orange Money", status: "released", fundedAt: daysAgo(30), requestedAt: daysAgo(11), releasedAt: daysAgo(9),
    report: report("Back-to-school workout series, 5 episodes, pinned PayLink offer in each.", ["https://youtube.com/watch?v=bts-fit"], daysAgo(11)),
  },
  {
    id: "p-2040", invoice: "INV-2040", campaign: "Back to School", brand: PAYLINK, creator: AMARA, gross: 3_100_000, method: "MTN MoMo", status: "released", fundedAt: daysAgo(30), requestedAt: daysAgo(10), releasedAt: daysAgo(9),
    report: report("Campus lookbook shoot and 4 carousel posts. 310K impressions.", ["https://instagram.com/p/campus-lookbook"], daysAgo(10)),
  },
  {
    id: "p-2038", invoice: "INV-2038", campaign: "Holiday Radiance", brand: SHEA, creator: MURIEL, gross: 1_950_000, method: "MTN MoMo", status: "released", fundedAt: daysAgo(60), requestedAt: daysAgo(42), releasedAt: daysAgo(40),
    report: report("Holiday gift-guide reel and giveaway. 4,800 entries.", ["https://instagram.com/reel/holiday-radiance"], daysAgo(42)),
  },
];

// In-memory stand-in for the withdrawals table. Balances are computed from releases minus these.
export const MOCK_WITHDRAWALS: Withdrawal[] = [
  { id: "w-301", creatorId: AMARA.id, amount: 1_200_000, method: "MTN MoMo", phone: "670112233", status: "completed", requestedAt: daysAgo(8), completedAt: daysAgo(8) },
  { id: "w-302", creatorId: AMARA.id, amount: 800_000, method: "MTN MoMo", phone: "670112233", status: "completed", requestedAt: daysAgo(4), completedAt: daysAgo(3) },
  { id: "w-303", creatorId: MURIEL.id, amount: 1_500_000, method: "Orange Money", phone: "655120348", status: "completed", requestedAt: daysAgo(38), completedAt: daysAgo(38) },
  { id: "w-304", creatorId: MURIEL.id, amount: 1_500_000, method: "Orange Money", phone: "655120348", status: "completed", requestedAt: daysAgo(8), completedAt: daysAgo(7) },
  { id: "w-305", creatorId: MURIEL.id, amount: 500_000, method: "MTN MoMo", phone: "677430981", status: "processing", requestedAt: daysAgo(0.2) },
];

function report(summary: string, links: string[], submittedAt: string): DeliveryReport {
  return { summary, links, submittedAt };
}

// Platform-wide monthly totals, oldest first. The ledger above shows only recent invoices.
export const MOCK_MONTHLY_PAYMENTS: MonthlyPaymentStat[] = [
  { month: "Apr", escrowVolume: 18_400_000, commission: 2_950_000, avgReleaseDays: 2.4 },
  { month: "May", escrowVolume: 21_700_000, commission: 3_380_000, avgReleaseDays: 2.1 },
  { month: "Jun", escrowVolume: 19_900_000, commission: 3_610_000, avgReleaseDays: 2.2 },
  { month: "Jul", escrowVolume: 24_600_000, commission: 3_940_000, avgReleaseDays: 1.9 },
  { month: "Aug", escrowVolume: 27_300_000, commission: 4_520_000, avgReleaseDays: 1.7 },
  { month: "Sep", escrowVolume: 29_850_000, commission: 5_040_000, avgReleaseDays: 1.6 },
];
