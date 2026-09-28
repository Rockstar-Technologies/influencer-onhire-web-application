"use server";

import { revalidatePath } from "next/cache";
import { fundCampaign } from "@/services/payments.service";
import { requireAccount } from "@/services/session.service";
import type { FundField, FundFormState, PaymentMethod } from "@/types/payments";

const METHODS: PaymentMethod[] = ["MTN MoMo", "Orange Money"];
const MIN_AMOUNT = 10_000;
const MAX_AMOUNT = 50_000_000;

// The brand is always taken from the session, never from the form, so one brand can't fund as another.
export async function fundCampaignAction(_previous: FundFormState, formData: FormData): Promise<FundFormState> {
  const brand = await requireAccount("brand");

  const read = (field: FundField) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const values = { creatorId: read("creatorId"), campaign: read("campaign"), amount: read("amount"), method: read("method"), phone: read("phone") };
  const amount = Number(values.amount.replace(/[^\d]/g, ""));
  const phone = values.phone.replace(/\D/g, "");

  const errors: Partial<Record<FundField, string>> = {};
  if (!values.creatorId) errors.creatorId = "Choose the creator you're paying.";
  if (values.campaign.length < 3 || values.campaign.length > 80) errors.campaign = "Enter a campaign name between 3 and 80 characters.";
  if (!amount || amount < MIN_AMOUNT || amount > MAX_AMOUNT)
    errors.amount = `Enter an amount between ${MIN_AMOUNT.toLocaleString("en-US")} and ${MAX_AMOUNT.toLocaleString("en-US")} CFA.`;
  if (!METHODS.includes(values.method as PaymentMethod)) errors.method = "Choose MTN MoMo or Orange Money.";
  if (!/^6\d{8}$/.test(phone)) errors.phone = "Enter the 9-digit number you're paying from, e.g. 677 123 456.";
  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  const payment = await fundCampaign({
    brandId: brand.id,
    creatorId: values.creatorId,
    campaign: values.campaign,
    amount,
    method: values.method as PaymentMethod,
  });
  if (!payment) return { status: "error", values, errors: { creatorId: "That creator can't receive payments right now. Choose another." } };

  revalidatePath("/brand/payments");
  revalidatePath("/admin", "layout");
  return { status: "success", invoice: payment.invoice, creatorName: payment.creator.name, amount: payment.gross };
}
