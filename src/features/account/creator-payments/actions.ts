"use server";

import { authorizeAction, PAYMENTS_NOT_CONNECTED } from "@/lib/auth/action-access";
import { MIN_WITHDRAWAL } from "@/services/payments.service";
import type { CashoutField, CashoutFormState, PaymentMethod, WithdrawField, WithdrawFormState } from "@/types/payments";

const METHODS: PaymentMethod[] = ["MTN MoMo", "Orange Money"];
const MAX_LINKS = 5;

// Links are shown to the brand and admins as clickable, so only plain web addresses are accepted.
function parseLinks(raw: string) {
  const lines = raw.split(/\s*\n\s*/).map((line) => line.trim()).filter(Boolean);
  const valid = lines.every((line) => {
    try {
      const url = new URL(line);
      return (url.protocol === "https:" || url.protocol === "http:") && line.length <= 300;
    } catch {
      return false;
    }
  });
  return { lines, valid };
}

// Delivery reports and withdrawals are not connected to the live payment service yet (milestone I-7): after the session and the input are
// checked, these refuse instead of reporting a result that does not exist.
export async function requestCashoutAction(_previous: CashoutFormState, formData: FormData): Promise<CashoutFormState> {
  const access = await authorizeAction({ role: "creator" });

  const read = (field: CashoutField | "paymentId") => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const values = { summary: read("summary"), links: read("links") };
  const links = parseLinks(values.links);

  const errors: Partial<Record<CashoutField, string>> = {};
  if (values.summary.length < 20 || values.summary.length > 1500) errors.summary = "Describe what you delivered in 20 to 1,500 characters.";
  if (links.lines.length === 0) errors.links = "Add at least one link to the content you posted.";
  else if (links.lines.length > MAX_LINKS) errors.links = `Add up to ${MAX_LINKS} links, one per line.`;
  else if (!links.valid) errors.links = "Each line must be a full web address starting with https://";
  if (!access.ok) return { status: "error", values, errors: {}, message: access.message };
  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  return { status: "error", values, errors: {}, message: PAYMENTS_NOT_CONNECTED };
}

export async function withdrawAction(_previous: WithdrawFormState, formData: FormData): Promise<WithdrawFormState> {
  const access = await authorizeAction({ role: "creator" });

  const read = (field: WithdrawField) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const values = { amount: read("amount"), method: read("method"), phone: read("phone") };
  const amount = Number(values.amount.replace(/[^\d]/g, ""));
  const phone = values.phone.replace(/\D/g, "");

  const errors: Partial<Record<WithdrawField, string>> = {};
  if (!amount) errors.amount = "Enter how much you want to withdraw.";
  else if (amount < MIN_WITHDRAWAL) errors.amount = `The minimum withdrawal is ${MIN_WITHDRAWAL.toLocaleString("en-US")} CFA.`;
  if (!METHODS.includes(values.method as PaymentMethod)) errors.method = "Choose MTN MoMo or Orange Money.";
  if (!/^6\d{8}$/.test(phone)) errors.phone = "Enter a 9-digit number starting with 6, e.g. 677 123 456.";
  if (!access.ok) return { status: "error", values, errors: {}, message: access.message };
  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  return { status: "error", values, errors: {}, message: PAYMENTS_NOT_CONNECTED };
}
