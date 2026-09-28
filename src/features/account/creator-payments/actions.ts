"use server";

import { revalidatePath } from "next/cache";
import { MIN_WITHDRAWAL, requestCashout, requestWithdrawal, splitPayment } from "@/services/payments.service";
import { requireAccount } from "@/services/session.service";
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

// The creator comes from the session and the service checks they own the payment,
// so nobody can request cashout on someone else's campaign.
export async function requestCashoutAction(_previous: CashoutFormState, formData: FormData): Promise<CashoutFormState> {
  const creator = await requireAccount("influencer");

  const read = (field: CashoutField | "paymentId") => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const paymentId = read("paymentId");
  const values = { summary: read("summary"), links: read("links") };
  const links = parseLinks(values.links);

  const errors: Partial<Record<CashoutField, string>> = {};
  if (values.summary.length < 20 || values.summary.length > 1500) errors.summary = "Describe what you delivered in 20 to 1,500 characters.";
  if (links.lines.length === 0) errors.links = "Add at least one link to the content you posted.";
  else if (links.lines.length > MAX_LINKS) errors.links = `Add up to ${MAX_LINKS} links, one per line.`;
  else if (!links.valid) errors.links = "Each line must be a full web address starting with https://";
  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  const payment = await requestCashout({ creatorId: creator.id, paymentId, report: { summary: values.summary, links: links.lines } });
  if (!payment) {
    return { status: "error", values, errors: {}, message: "This payment is no longer on hold, so cashout can't be requested. Refresh to see its status." };
  }

  revalidatePath("/creator/payments");
  revalidatePath("/brand/payments");
  revalidatePath("/admin", "layout");
  return { status: "success", net: splitPayment(payment.gross).net };
}

// The amount is checked against the balance again in the service, so a stale form can't overdraw.
export async function withdrawAction(_previous: WithdrawFormState, formData: FormData): Promise<WithdrawFormState> {
  const creator = await requireAccount("influencer");

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
  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  const withdrawal = await requestWithdrawal({ creatorId: creator.id, amount, method: values.method as PaymentMethod, phone });
  if (!withdrawal) return { status: "error", values, errors: { amount: "That's more than your available balance. Check the amount and try again." } };

  revalidatePath("/creator/payments");
  return { status: "success", withdrawal };
}
