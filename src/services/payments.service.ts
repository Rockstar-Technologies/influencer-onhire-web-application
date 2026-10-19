import type {
  BrandPaymentSummary,
  BrandPaymentView,
  CreatorPaymentSummary,
  CreatorPaymentView,
  DeliveryReport,
  EscrowPayment,
  MonthlyPaymentStat,
  PaymentMethod,
  PaymentQuery,
  PaymentSplit,
  PaymentSummary,
  CreatorWallet,
  Withdrawal,
} from "@/types/payments";
import { MOCK_MONTHLY_PAYMENTS, MOCK_PAYMENTS, MOCK_WITHDRAWALS } from "./mock/payments.mock";
import { getActiveAccount, sendUserMessage } from "./user-management.service";

export const PLATFORM_FEE_RATE = 0.2;

// The fee is rounded once and the payout is the remainder, so fee + net always equals gross exactly.
export function splitPayment(gross: number): PaymentSplit {
  const fee = Math.round(gross * PLATFORM_FEE_RATE);
  return { gross, fee, net: gross - fee };
}

const byNewest = (a: EscrowPayment, b: EscrowPayment) => b.fundedAt.localeCompare(a.fundedAt);

// --- admin ---

export async function listPayments(query: PaymentQuery): Promise<EscrowPayment[]> {
  // TODO: replace with `fetch("/api/admin/payments?" + params)` once the backend exists
  const term = query.q.trim().toLowerCase();
  return MOCK_PAYMENTS.filter(
    (payment) =>
      (query.status === "all" || payment.status === query.status) &&
      (!term ||
        [payment.invoice, payment.campaign, payment.brand.name, payment.creator.name].some((value) => value.toLowerCase().includes(term))),
  ).sort(byNewest);
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
    `${net.toLocaleString("en-US")} CFA for "${payment.campaign}" has been added to your balance. You can withdraw it to mobile money any time.`,
  );
  await sendUserMessage(
    [payment.brand.id],
    "Payment released to creator",
    `Your deposit for "${payment.campaign}" has been released to ${payment.creator.name}.`,
  );
  return payment;
}

// --- brand and creator dashboards ---
// Each view is shaped on the server so fields an account must not see never reach the browser.

export async function listBrandPayments(brandId: string): Promise<BrandPaymentView[]> {
  // TODO: replace with `fetch("/api/brand/payments")`, scoped to the signed-in brand by the backend
  return MOCK_PAYMENTS.filter((payment) => payment.brand.id === brandId)
    .sort(byNewest)
    .map((payment) => ({
      id: payment.id,
      invoice: payment.invoice,
      campaign: payment.campaign,
      creatorName: payment.creator.name,
      deposited: payment.gross,
      method: payment.method,
      status: payment.status,
      fundedAt: payment.fundedAt,
      requestedAt: payment.requestedAt,
      releasedAt: payment.releasedAt,
      report: payment.report,
    }));
}

export async function listCreatorPayments(creatorId: string): Promise<CreatorPaymentView[]> {
  // TODO: replace with `fetch("/api/creator/payments")`, scoped to the signed-in creator by the backend
  return MOCK_PAYMENTS.filter((payment) => payment.creator.id === creatorId)
    .sort(byNewest)
    .map((payment) => ({
      id: payment.id,
      invoice: payment.invoice,
      campaign: payment.campaign,
      brandName: payment.brand.name,
      split: splitPayment(payment.gross),
      status: payment.status,
      fundedAt: payment.fundedAt,
      requestedAt: payment.requestedAt,
      releasedAt: payment.releasedAt,
      report: payment.report,
    }));
}

export function summarizeBrandPayments(payments: BrandPaymentView[]): BrandPaymentSummary {
  const sum = (status?: BrandPaymentView["status"]) =>
    payments.filter((payment) => !status || payment.status === status).reduce((total, payment) => total + payment.deposited, 0);
  return { totalDeposited: sum(), onHold: sum("held"), awaitingRelease: sum("requested"), released: sum("released") };
}

export function summarizeCreatorPayments(payments: CreatorPaymentView[]): CreatorPaymentSummary {
  const sum = (status?: CreatorPaymentView["status"]) =>
    payments.filter((payment) => !status || payment.status === status).reduce((total, payment) => total + payment.split.net, 0);
  return { onHold: sum("held"), awaitingRelease: sum("requested"), released: sum("released"), totalEarnings: sum() };
}

export async function fundCampaign(input: {
  brandId: string;
  creatorId: string;
  campaign: string;
  amount: number;
  method: PaymentMethod;
}): Promise<EscrowPayment | null> {
  // TODO: replace with `fetch("/api/brand/payments", { method: "POST", ... })` — the backend collects the mobile money payment first
  const [brand, creator] = await Promise.all([getActiveAccount(input.brandId), getActiveAccount(input.creatorId)]);
  if (!brand || brand.type !== "brand" || !creator || creator.type !== "creator") return null;

  const number = Math.max(0, ...MOCK_PAYMENTS.map((payment) => Number(payment.invoice.slice(4)))) + 1;
  const payment: EscrowPayment = {
    id: `p-${number}`,
    invoice: `INV-${number}`,
    campaign: input.campaign,
    brand: { id: brand.id, name: brand.name },
    creator: { id: creator.id, name: creator.name },
    gross: input.amount,
    method: input.method,
    status: "held",
    fundedAt: new Date().toISOString(),
  };
  MOCK_PAYMENTS.push(payment);

  const { net } = splitPayment(payment.gross);
  await sendUserMessage(
    [creator.id],
    "Payment on hold for you",
    `${brand.name} funded "${payment.campaign}". ${net.toLocaleString("en-US")} CFA is held in escrow for you until you deliver and request cashout.`,
  );
  return payment;
}

// Only the creator on the payment can request cashout, and only while the money is still on hold.
export async function requestCashout(input: {
  creatorId: string;
  paymentId: string;
  report: Omit<DeliveryReport, "submittedAt">;
}): Promise<EscrowPayment | null> {
  // TODO: replace with `fetch("/api/creator/payments/" + paymentId + "/cashout", { method: "POST", ... })`
  const payment = MOCK_PAYMENTS.find((candidate) => candidate.id === input.paymentId);
  if (!payment || payment.creator.id !== input.creatorId || payment.status !== "held") return null;

  const submittedAt = new Date().toISOString();
  payment.status = "requested";
  payment.requestedAt = submittedAt;
  payment.report = { ...input.report, submittedAt };

  await sendUserMessage(
    [payment.brand.id],
    "Delivery report submitted",
    `${payment.creator.name} finished "${payment.campaign}" and requested cashout. You can read their report on your Payments page.`,
  );
  return payment;
}

// --- creator balance and withdrawals ---

export const MIN_WITHDRAWAL = 1_000;

export async function getCreatorWallet(creatorId: string): Promise<CreatorWallet> {
  // TODO: replace with `fetch("/api/creator/wallet")`
  const released = MOCK_PAYMENTS.filter((payment) => payment.creator.id === creatorId && payment.status === "released").reduce(
    (sum, payment) => sum + splitPayment(payment.gross).net,
    0,
  );
  const mine = MOCK_WITHDRAWALS.filter((withdrawal) => withdrawal.creatorId === creatorId);
  const total = (status: Withdrawal["status"]) => mine.filter((w) => w.status === status).reduce((sum, w) => sum + w.amount, 0);
  const processing = total("processing");
  const withdrawn = total("completed");
  return { available: released - processing - withdrawn, processing, withdrawn };
}

export async function listWithdrawals(creatorId: string): Promise<Withdrawal[]> {
  // TODO: replace with `fetch("/api/creator/withdrawals")`
  return MOCK_WITHDRAWALS.filter((withdrawal) => withdrawal.creatorId === creatorId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

// Returns null when the amount is more than the creator can withdraw right now.
export async function requestWithdrawal(input: {
  creatorId: string;
  amount: number;
  method: PaymentMethod;
  phone: string;
}): Promise<Withdrawal | null> {
  // TODO: replace with `fetch("/api/creator/withdrawals", { method: "POST", ... })` — the backend must check the balance
  // and record the withdrawal in one transaction, then send the mobile money transfer.
  const { available } = await getCreatorWallet(input.creatorId);
  if (input.amount < MIN_WITHDRAWAL || input.amount > available) return null;

  const withdrawal: Withdrawal = {
    id: `w-${MOCK_WITHDRAWALS.length + 301}`,
    creatorId: input.creatorId,
    amount: input.amount,
    method: input.method,
    phone: input.phone,
    status: "processing",
    requestedAt: new Date().toISOString(),
  };
  MOCK_WITHDRAWALS.push(withdrawal);

  await sendUserMessage(
    [input.creatorId],
    "Withdrawal request received",
    `${input.amount.toLocaleString("en-US")} CFA to your ${input.method} number ending ${input.phone.slice(-3)} was received and is subject to review. Any applicable fees and estimated processing times will be shown when confirmed.`,
  );
  return withdrawal;
}

// Public campaign pages share the campaign escrow explanation.
export { listEscrowSteps } from "./campaign-payments.service";
