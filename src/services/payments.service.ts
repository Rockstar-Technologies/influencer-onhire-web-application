import type { EscrowPayment, MonthlyPaymentStat, PaymentQuery, PaymentSplit, PaymentSummary } from "@/types/payments";
import { MOCK_MONTHLY_PAYMENTS, MOCK_PAYMENTS } from "./mock/payments.mock";
import { sendUserMessage } from "./user-management.service";

export const PLATFORM_FEE_RATE = 0.2;

// The fee is rounded once and the payout is the remainder, so fee + net always equals gross exactly.
export function splitPayment(gross: number): PaymentSplit {
  const fee = Math.round(gross * PLATFORM_FEE_RATE);
  return { gross, fee, net: gross - fee };
}

export async function listPayments(query: PaymentQuery): Promise<EscrowPayment[]> {
  // TODO: replace with `fetch("/api/admin/payments?" + params)` once the backend exists
  const term = query.q.trim().toLowerCase();
  return MOCK_PAYMENTS.filter(
    (payment) =>
      (query.status === "all" || payment.status === query.status) &&
      (!term ||
        [payment.invoice, payment.campaign, payment.brand.name, payment.creator.name].some((value) => value.toLowerCase().includes(term))),
  ).sort((a, b) => b.fundedAt.localeCompare(a.fundedAt));
}

export async function getPaymentSummary(): Promise<PaymentSummary> {
  // TODO: replace with `fetch("/api/admin/payments/summary")`
  const released = MOCK_PAYMENTS.filter((payment) => payment.status === "released");
  const unreleased = MOCK_PAYMENTS.filter((payment) => payment.status !== "released");
  const total = (payments: EscrowPayment[], part: keyof PaymentSplit) =>
    payments.reduce((sum, payment) => sum + splitPayment(payment.gross)[part], 0);

  return {
    grossDeposits: total(MOCK_PAYMENTS, "gross"),
    netPayouts: total(released, "net"),
    platformRevenue: total(released, "fee"),
    pendingRevenue: total(unreleased, "fee"),
    heldInEscrow: total(unreleased, "gross"),
    heldCount: unreleased.length,
    payoutRequests: MOCK_PAYMENTS.filter((payment) => payment.status === "requested").length,
    releasedCount: released.length,
    invoiceCount: MOCK_PAYMENTS.length,
  };
}

export async function listMonthlyPaymentStats(): Promise<MonthlyPaymentStat[]> {
  // TODO: replace with `fetch("/api/admin/payments/monthly?months=6")`
  return MOCK_MONTHLY_PAYMENTS;
}

// Only a requested payout can be released; anything else returns null and nothing changes.
export async function releasePayment(id: string): Promise<EscrowPayment | null> {
  // TODO: replace with `fetch("/api/admin/payments/" + id + "/release", { method: "POST" })` — the backend triggers the mobile money transfer
  const payment = MOCK_PAYMENTS.find((candidate) => candidate.id === id);
  if (!payment || payment.status !== "requested") return null;
  payment.status = "released";
  payment.releasedAt = new Date().toISOString();

  const { net } = splitPayment(payment.gross);
  await sendUserMessage(
    [payment.creator.id],
    "Payment released",
    `${net.toLocaleString("en-US")} CFA for "${payment.campaign}" has been sent to your ${payment.method} account.`,
  );
  return payment;
}
