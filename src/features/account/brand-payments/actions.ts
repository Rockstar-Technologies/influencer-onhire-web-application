"use server";

import { authorizeAction, PAYMENTS_NOT_CONNECTED } from "@/lib/auth/action-access";
import type { FundField, FundFormState, PaymentMethod } from "@/types/payments";

const METHODS: PaymentMethod[] = ["MTN MoMo", "Orange Money"];
const MIN_AMOUNT = 10_000;
const MAX_AMOUNT = 50_000_000;

// The brand is always the signed-in session user, never a form value. Funding is not connected to the live payment service yet (milestone I-7),
// so after validation this refuses instead of showing a payment that does not exist.
export async function fundCampaignAction(_previous: FundFormState, formData: FormData): Promise<FundFormState> {
  const access = await authorizeAction({ role: "brand" });

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
  if (!access.ok) return { status: "error", values, errors: {}, message: access.message };
  if (Object.keys(errors).length > 0) return { status: "error", values, errors };

  return { status: "error", values, errors: {}, message: PAYMENTS_NOT_CONNECTED };
}
