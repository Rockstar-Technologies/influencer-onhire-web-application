import type { EscrowPayment, MonthlyPaymentStat } from "@/types/payments";

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

// In-memory stand-in for the escrow_payments table. Releasing a payment mutates its row.
export const MOCK_PAYMENTS: EscrowPayment[] = [
  { id: "p-2051", invoice: "INV-2051", campaign: "Autumn Glow Launch", brand: SHEA, creator: AMARA, gross: 2_400_000, method: "MTN MoMo", status: "held", fundedAt: daysAgo(2) },
  { id: "p-2052", invoice: "INV-2052", campaign: "Autumn Glow Launch", brand: SHEA, creator: MURIEL, gross: 1_800_000, method: "Orange Money", status: "requested", fundedAt: daysAgo(12), requestedAt: daysAgo(1) },
  { id: "p-2047", invoice: "INV-2047", campaign: "Summer Cashback", brand: PAYLINK, creator: JAMES, gross: 1_850_000, method: "MTN MoMo", status: "requested", fundedAt: daysAgo(15), requestedAt: daysAgo(5) },
  { id: "p-2046", invoice: "INV-2046", campaign: "Summer Cashback", brand: PAYLINK, creator: AMARA, gross: 1_600_000, method: "MTN MoMo", status: "requested", fundedAt: daysAgo(15), requestedAt: daysAgo(2) },
  { id: "p-2049", invoice: "INV-2049", campaign: "Zanzibar Escape", brand: WANDERLUST, creator: TARIQ, gross: 900_000, method: "MTN MoMo", status: "held", fundedAt: daysAgo(20) },
  { id: "p-2043", invoice: "INV-2043", campaign: "Back to School", brand: PAYLINK, creator: MURIEL, gross: 2_900_000, method: "Orange Money", status: "released", fundedAt: daysAgo(30), requestedAt: daysAgo(11), releasedAt: daysAgo(9) },
  { id: "p-2040", invoice: "INV-2040", campaign: "Back to School", brand: PAYLINK, creator: AMARA, gross: 3_100_000, method: "MTN MoMo", status: "released", fundedAt: daysAgo(30), requestedAt: daysAgo(10), releasedAt: daysAgo(9) },
  { id: "p-2038", invoice: "INV-2038", campaign: "Holiday Radiance", brand: SHEA, creator: MURIEL, gross: 1_950_000, method: "MTN MoMo", status: "released", fundedAt: daysAgo(60), requestedAt: daysAgo(42), releasedAt: daysAgo(40) },
];

// Platform-wide monthly totals, oldest first. The ledger above shows only recent invoices.
export const MOCK_MONTHLY_PAYMENTS: MonthlyPaymentStat[] = [
  { month: "Apr", escrowVolume: 18_400_000, commission: 2_950_000, avgReleaseDays: 2.4 },
  { month: "May", escrowVolume: 21_700_000, commission: 3_380_000, avgReleaseDays: 2.1 },
  { month: "Jun", escrowVolume: 19_900_000, commission: 3_610_000, avgReleaseDays: 2.2 },
  { month: "Jul", escrowVolume: 24_600_000, commission: 3_940_000, avgReleaseDays: 1.9 },
  { month: "Aug", escrowVolume: 27_300_000, commission: 4_520_000, avgReleaseDays: 1.7 },
  { month: "Sep", escrowVolume: 29_850_000, commission: 5_040_000, avgReleaseDays: 1.6 },
];
