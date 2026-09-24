"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/shared/button";
import { Modal } from "@/components/shared/modal";
import { cn } from "@/lib/utils";
import { listMyCampaigns } from "@/services/campaigns.service";
import { fundCampaign } from "@/services/payments.service";
import type { CampaignPayment, PaymentInfluencer, PaymentMethod } from "@/types/payment";
import { METHOD_LABELS } from "../payment-format";

interface FundValues {
  campaignTitle: string;
  influencerId: string;
  amount: string;
  method: PaymentMethod;
  payerPhone: string;
}

type FundErrors = Partial<Record<keyof FundValues, string>>;

// Cameroon mobile money numbers: 9 digits starting with 6, optional +237 prefix.
function normalizePhone(value: string) {
  return value.replace(/[\s-]/g, "").replace(/^\+?237/, "");
}

function validate(values: FundValues): FundErrors {
  const errors: FundErrors = {};
  if (!values.campaignTitle.trim()) errors.campaignTitle = "Enter the campaign you're funding.";
  if (!values.influencerId) errors.influencerId = "Choose the influencer you hired.";
  const amount = Number(values.amount.replace(/[\s,$]/g, ""));
  if (!values.amount.trim()) errors.amount = "Enter an amount.";
  else if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Amount must be a number above 0.";
  if (!/^6\d{8}$/.test(normalizePhone(values.payerPhone))) {
    errors.payerPhone = "Use a 9-digit Cameroon number starting with 6, e.g. 677 123 456.";
  }
  return errors;
}

const inputClass = (hasError: boolean) =>
  cn(
    "h-11 w-full rounded-lg border bg-surface px-3 text-sm text-heading outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15",
    hasError ? "border-danger" : "border-border"
  );

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-medium text-danger">
      {message}
    </p>
  );
}

export function FundCampaignDialog({
  influencers,
  onClose,
  onFunded,
}: {
  influencers: PaymentInfluencer[];
  onClose: () => void;
  onFunded: (payment: CampaignPayment) => void;
}) {
  const [values, setValues] = useState<FundValues>({
    campaignTitle: "",
    influencerId: "",
    amount: "",
    method: "mtn_momo",
    payerPhone: "",
  });
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [campaignTitles, setCampaignTitles] = useState<string[]>([]);

  useEffect(() => {
    listMyCampaigns().then((campaigns) => setCampaignTitles(campaigns.map((campaign) => campaign.title)));
  }, []);

  const errors = attempted ? validate(values) : {};
  const set = <K extends keyof FundValues>(key: K, value: FundValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(validate(values)).length) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payment = await fundCampaign({
        campaignTitle: values.campaignTitle.trim(),
        influencerId: values.influencerId,
        amount: Number(values.amount.replace(/[\s,$]/g, "")),
        method: values.method,
        payerPhone: normalizePhone(values.payerPhone).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
      });
      onFunded(payment);
    } catch {
      setSubmitError("The payment didn't go through. Check the number and try again.");
      setSubmitting(false);
    }
  }

  return (
    <Modal titleId="fund-title" onClose={onClose}>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Step 1 · You Pay</p>
      <h2 id="fund-title" className="mt-1 text-xl font-bold text-heading">
        Fund a Campaign
      </h2>
      <p className="mt-1 text-sm text-body">
        Your payment is held in escrow and only released once the influencer delivers.
      </p>

      <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fund-campaign" className="text-sm font-semibold text-heading">
            Campaign
          </label>
          <input
            id="fund-campaign"
            list="fund-campaign-options"
            value={values.campaignTitle}
            onChange={(event) => set("campaignTitle", event.target.value)}
            placeholder="e.g. Summer Glow Launch"
            aria-invalid={Boolean(errors.campaignTitle)}
            aria-describedby="fund-campaign-error"
            className={inputClass(Boolean(errors.campaignTitle))}
          />
          <datalist id="fund-campaign-options">
            {campaignTitles.map((title) => (
              <option key={title} value={title} />
            ))}
          </datalist>
          <FieldError id="fund-campaign-error" message={errors.campaignTitle} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fund-influencer" className="text-sm font-semibold text-heading">
            Influencer
          </label>
          <select
            id="fund-influencer"
            value={values.influencerId}
            onChange={(event) => set("influencerId", event.target.value)}
            aria-invalid={Boolean(errors.influencerId)}
            aria-describedby="fund-influencer-error"
            className={cn(inputClass(Boolean(errors.influencerId)), "cursor-pointer")}
          >
            <option value="">Select an influencer</option>
            {influencers.map((influencer) => (
              <option key={influencer.id} value={influencer.id}>
                {influencer.name}
              </option>
            ))}
          </select>
          <FieldError id="fund-influencer-error" message={errors.influencerId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fund-amount" className="text-sm font-semibold text-heading">
            Amount (FCFA)
          </label>
          <input
            id="fund-amount"
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => set("amount", event.target.value)}
            placeholder="e.g. 900,000"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby="fund-amount-error"
            className={inputClass(Boolean(errors.amount))}
          />
          <FieldError id="fund-amount-error" message={errors.amount} />
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-heading">Payment method</legend>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((method) => (
              <label
                key={method}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  values.method === method ? "border-primary bg-primary-light text-primary" : "border-border text-heading"
                )}
              >
                <input
                  type="radio"
                  name="fund-method"
                  value={method}
                  checked={values.method === method}
                  onChange={() => set("method", method)}
                  className="accent-[var(--color-primary)]"
                />
                {METHOD_LABELS[method]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fund-phone" className="text-sm font-semibold text-heading">
            {METHOD_LABELS[values.method]} number
          </label>
          <input
            id="fund-phone"
            type="tel"
            inputMode="tel"
            value={values.payerPhone}
            onChange={(event) => set("payerPhone", event.target.value)}
            placeholder="e.g. 677 123 456"
            aria-invalid={Boolean(errors.payerPhone)}
            aria-describedby="fund-phone-error"
            className={inputClass(Boolean(errors.payerPhone))}
          />
          <FieldError id="fund-phone-error" message={errors.payerPhone} />
        </div>

        {submitError && (
          <p className="text-sm font-medium text-danger" role="alert">
            {submitError}
          </p>
        )}

        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Processing payment…" : "Pay into Escrow"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
