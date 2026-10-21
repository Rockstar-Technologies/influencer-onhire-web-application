import type { FundingStatus, FundingView } from "@/lib/api/schemas";
import { PAYMENT_METHOD } from "@/lib/domain/vocabulary";
import type { PaymentMethodCode } from "@/lib/domain/vocabulary";

/** The payer number as the API wants it: 9 digits starting with 6, without +237, spaces or dashes. */
export function normalizePayerPhone(value: string): string {
  return value.replace(/[\s-]/g, "").replace(/^\+?237/, "");
}

export interface FundValues {
  paymentMethod: string;
  payerPhone: string;
}
export type FundField = keyof FundValues;
export type FundErrors = Partial<Record<FundField | "form", string>>;

/** Friendly checks before anything is sent. The API stays the authority (it also checks the offer, the deadline and the provider's limits). */
export function validateFundForm(values: FundValues): FundErrors {
  const errors: FundErrors = {};
  if (!PAYMENT_METHOD.is(values.paymentMethod)) errors.paymentMethod = "Choose MTN MoMo or Orange Money.";
  if (!/^6\d{8}$/.test(normalizePayerPhone(values.payerPhone))) errors.payerPhone = "Enter the 9-digit number you're paying from, e.g. 677 123 456.";
  return errors;
}

/** The request body. There is NO amount, status, provider, brand or offer id: the offer is in the path, the brand is the session, the amount is the offer's price. */
export function fundToApi(values: { paymentMethod: PaymentMethodCode; payerPhone: string }) {
  return { paymentMethod: values.paymentMethod, payerPhone: normalizePayerPhone(values.payerPhone) };
}

const API_FIELD: Record<string, FundField> = { paymentMethod: "paymentMethod", payerPhone: "payerPhone" };

export function fundErrorsFromDetails(details: readonly { path: string; message: string }[]): FundErrors {
  const errors: FundErrors = {};
  for (const detail of details) {
    const field = detail.path.replace(/^body\./, "").split(/[.[]/)[0] ?? "";
    const key = API_FIELD[field] ?? "form";
    if (!errors[key]) errors[key] = detail.message;
  }
  return errors;
}

export type FundingTone = "good" | "wait" | "bad" | "neutral";

export interface FundingMessage {
  tone: FundingTone;
  title: string;
  text: string;
}

/**
 * What each funding status means, in plain words. Only `funded` ever says money is held, and that comes from the API's own `funded` status (a payment
 * exists): a request that is merely sent, pending or unclear is never described as paid.
 */
export function fundingMessage(funding: Pick<FundingView, "status" | "payment" | "simulated">): FundingMessage {
  switch (funding.status) {
    case "not_started":
      return { tone: "neutral", title: "Not paid yet", text: "Nothing has been paid for this booking." };
    case "awaiting_confirmation":
      return { tone: "wait", title: "Waiting for confirmation", text: "The payment request was sent. Nothing is paid until the payment provider confirms it. Approve the request on your phone if you are asked, then check the status." };
    case "indeterminate":
      return { tone: "wait", title: "Confirmation unclear", text: "We could not get a clear answer from the payment provider. The payment may still go through, so you can't start a second one. Check the status again shortly." };
    case "failed":
      return { tone: "bad", title: "Payment not completed", text: "The payment was not completed and nothing was taken. You can try again before the deadline." };
    case "under_review":
      return { tone: "wait", title: "Under review", text: "The provider reports that it collected the money, but it could not be put into escrow. Our team has been flagged to review it. Please do not pay again." };
    case "funded":
      return { tone: "good", title: "Paid and held in escrow", text: `Your payment${funding.payment ? ` (${funding.payment.reference})` : ""} is held in escrow until the work is delivered and confirmed.` };
    case "expired":
      return { tone: "bad", title: "Payment window ended", text: "This booking was not paid in time, so it lapsed and can no longer be paid." };
  }
}

/** A status that still lets the page poll the API by hand ("Check status"). */
export function isUnsettled(status: FundingStatus): boolean {
  return status === "awaiting_confirmation" || status === "indeterminate" || status === "under_review";
}

export const FAILURE_CATEGORY_LABELS: Record<string, string> = {
  rejected: "The provider declined the payment.",
  insufficient_funds: "Not enough balance on that number.",
  timeout: "The provider did not answer in time.",
  unknown: "The provider did not give a reason.",
};

/** A fresh Idempotency-Key for one funding intent (UUID without dashes would also match; dashes are allowed by the API). */
export function newFundingKey(): string {
  return `fund-${globalThis.crypto.randomUUID()}`;
}
