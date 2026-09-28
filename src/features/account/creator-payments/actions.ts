"use server";

import { revalidatePath } from "next/cache";
import { requestCashout, splitPayment } from "@/services/payments.service";
import { requireAccount } from "@/services/session.service";
import type { CashoutField, CashoutFormState, PaymentMethod } from "@/types/payments";

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
  const values = { summary: read("summary"), links: read("links"), method: read("method"), phone: read("phone") };
  const links = parseLinks(values.links);
  const phone = values.phone.replace(/\D/g, "");

  const errors: Partial<Record<CashoutField, string>> = {};
  if (values.summary.length < 20 || values.summary.length > 1500) errors.summary = "Describe what you delivered in 20 to 1,500 characters.";
  if (links.lines.length === 0) errors.links = "Add at least one link to the content you posted.";
  else if (links.lines.length > MAX_LINKS) errors.links = `Add up to ${MAX_LINKS} links, one per line.`;
  else if (!links.valid) errors.links = "Each line must be a full web address starting with https://";
  if (!METHODS.includes(values.method as PaymentMethod)) errors.method = "Choose MTN MoMo or Orange Money.";
  if (!/^6\d{8}$/.test(phone)) errors.phone = "Enter the 9-digit number to receive your money, e.g. 677 123 456.";
  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  const payment = await requestCashout({
    creatorId: creator.id,
    paymentId,
    report: { summary: values.summary, links: links.lines },
    payoutTo: { method: values.method as PaymentMethod, phone },
  });
  if (!payment) {
    return { status: "error", values, errors: {}, message: "This payment is no longer on hold, so cashout can't be requested. Refresh to see its status." };
  }

  revalidatePath("/creator/payments");
  revalidatePath("/brand/payments");
  revalidatePath("/admin", "layout");
  return { status: "success", net: splitPayment(payment.gross).net };
}
