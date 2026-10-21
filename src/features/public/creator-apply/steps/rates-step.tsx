"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, formatFrs, formatNumber, isCameroonMobile, parseAmount } from "@/lib/format";
import { saveRatesAction, submitApplicationAction } from "@/features/creator-application/actions";
import { failureNotice, fieldError } from "@/features/creator-application/messages";
import type { FailureNotice } from "@/features/creator-application/messages";
import { ratesToApi, revisionsLabel, usageRightsLabel } from "@/features/creator-application/mapping";
import type { RatesForm } from "@/features/creator-application/mapping";
import type { WizardStep } from "@/features/creator-application/mapping";
import type { ApplicationOptions } from "@/lib/api/schemas";
import { PAYMENT_METHOD } from "@/lib/domain/vocabulary";
import type { PaymentMethodCode, PlatformCode } from "@/lib/domain/vocabulary";
import { Field, PlatformIcon, SectionTitle, StepActions, controlClass } from "../apply-ui";

interface Errors {
  prices?: Partial<Record<PlatformCode, string>>;
  deliverables?: string;
  payout?: string;
  confirmed?: string;
}

const STEP_LABEL: Record<WizardStep, string> = { profile: "Step 1 (About you)", audience: "Step 2 (Audience & work)", rates: "Step 3 (Rates & payment)" };

export function RatesStep({ options, initial, platforms }: { options: ApplicationOptions; initial: RatesForm; platforms: PlatformCode[] }) {
  const router = useRouter();
  const [form, setForm] = useState<RatesForm>(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false); // shared by Back and Submit: only one request at a time
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [otherSteps, setOtherSteps] = useState<WizardStep[]>([]);

  const { limits } = options;
  const platformName = (code: PlatformCode) => options.platforms.find((p) => p.code === code)?.name ?? code;
  const fromPrice = (() => {
    const valid = platforms.map((code) => parseAmount(form.prices[code] ?? "")).filter((n) => Number.isFinite(n) && n > 0);
    return valid.length ? Math.min(...valid) : null;
  })();

  function validate(): Errors {
    const errors: Errors = {};
    const priceErrors: Partial<Record<PlatformCode, string>> = {};
    for (const code of platforms) {
      const value = parseAmount(form.prices[code] ?? "");
      if (!Number.isFinite(value) || value < limits.minPricePerPlatformXaf) {
        priceErrors[code] = `Set at least ${formatNumber(limits.minPricePerPlatformXaf)} Frs.`;
      }
    }
    if (Object.keys(priceErrors).length) errors.prices = priceErrors;
    const deliverables = form.deliverables.trim().length;
    if (deliverables < 3) errors.deliverables = "Describe what one booking includes.";
    else if (deliverables > 1000) errors.deliverables = "Keep this under 1,000 characters.";
    const accounts = PAYMENT_METHOD.values.filter((m) => form.payout[m].on);
    if (accounts.length === 0) errors.payout = "Choose at least one mobile money account.";
    else if (accounts.some((m) => !isCameroonMobile(form.payout[m].number))) {
      errors.payout = "Use a 9-digit Cameroon number starting with 6 for each account. For your security we never show saved numbers, so enter it again.";
    }
    if (!confirmed) errors.confirmed = "Please confirm your details are accurate.";
    return errors;
  }

  const local = attempted ? validate() : {};
  const priceError = (code: PlatformCode) => local.prices?.[code] ?? fieldError(serverErrors, `prices.${code}`) ?? (platforms.length === 1 ? fieldError(serverErrors, "prices") : undefined);
  const deliverablesError = local.deliverables ?? fieldError(serverErrors, "deliverables");
  const payoutError = local.payout ?? fieldError(serverErrors, "payoutAccounts");

  const patch = (change: Partial<RatesForm>) => {
    setForm((current) => ({ ...current, ...change }));
    setServerErrors((current) => (Object.keys(current).length ? {} : current));
  };
  const patchPayout = (method: PaymentMethodCode, change: Partial<RatesForm["payout"][PaymentMethodCode]>) =>
    patch({ payout: { ...form.payout, [method]: { ...form.payout[method], ...change } } });

  const fail = (error: Parameters<typeof failureNotice>[0], ratesSaved = false) => {
    setServerErrors(error.kind === "validation" ? error.fields : {});
    setOtherSteps(error.kind === "validation" ? error.steps.filter((step) => step !== "rates") : []);
    setNotice(failureNotice(error, "/for-creators/apply/rates", { ratesSaved }));
  };

  async function handleBack() {
    if (inFlight.current) return;
    // Rates are only saved on the way back when they are valid: the API refuses an incomplete step, and nothing may be reported as saved
    // when it was not. Otherwise the person simply goes back and these edits are not kept.
    if (Object.keys(validate()).filter((key) => key !== "confirmed").length === 0) {
      inFlight.current = true;
      setBusy(true);
      try {
        const result = await saveRatesAction(ratesToApi(form, platforms));
        if (!result.ok) {
          fail(result.error);
          inFlight.current = false;
          setBusy(false);
          return;
        }
      } catch {
        fail({ kind: "unavailable", requestId: null });
        inFlight.current = false;
        setBusy(false);
        return;
      }
    }
    router.push("/for-creators/apply/audience");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return; // double-click and double-Enter protection; the API also refuses a second submission (409)
    setAttempted(true);
    setNotice(null);
    setOtherSteps([]);
    if (Object.keys(validate()).length) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await submitApplicationAction({ rates: ratesToApi(form, platforms), confirmAccuracy: true });
      if (result.ok) {
        router.push("/for-creators/apply/submitted");
        return;
      }
      fail(result.error, result.ratesSaved);
    } catch {
      fail({ kind: "unavailable", requestId: null });
    }
    inFlight.current = false;
    setBusy(false);
  }

  const selectTerm = <K extends "minimumBooking" | "revisionsRounds" | "usageRightsMonths" | "depositTerms">(
    key: K,
    label: string,
    choices: { value: RatesForm[K]; label: string }[],
  ) => (
    <Field id={`apply-${key}`} label={label} error={fieldError(serverErrors, key)}>
      <select
        id={`apply-${key}`}
        value={String(form[key])}
        onChange={(event) => {
          const chosen = choices.find((choice) => String(choice.value) === event.target.value);
          if (chosen) patch({ [key]: chosen.value } as Partial<RatesForm>);
        }}
        className={controlClass() + " h-10 cursor-pointer"}
      >
        {choices.map((choice) => (
          <option key={String(choice.value)} value={String(choice.value)}>
            {choice.label}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SectionTitle>Your price per platform</SectionTitle>
        <p className="-mt-2 text-sm text-body">What a brand pays for one booking on each platform, in FCFA.</p>
        {platforms.map((code) => (
          <div key={code} className="flex flex-col gap-1">
            <label htmlFor={`price-${code}`} className="flex items-center gap-3">
              <PlatformIcon platform={code} decorative />
              <span className="w-24 text-sm font-semibold text-heading">{platformName(code)}</span>
              <span className="relative flex-1">
                <input
                  id={`price-${code}`}
                  inputMode="numeric"
                  value={form.prices[code] ?? ""}
                  onChange={(event) => patch({ prices: { ...form.prices, [code]: event.target.value } })}
                  placeholder="e.g. 400,000"
                  className={controlClass(Boolean(priceError(code))) + " h-10 pr-12"}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">Frs</span>
              </span>
            </label>
            {priceError(code) && <p className="pl-[8.5rem] text-xs font-medium text-danger">{priceError(code)}</p>}
          </div>
        ))}
        {fromPrice !== null && (
          <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">
            Brands will see: <strong className="font-semibold">From {formatFrs(fromPrice)}</strong>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Contract terms</SectionTitle>
        <p className="-mt-3 text-sm text-body">We&apos;ve filled in common terms — change anything that doesn&apos;t suit you.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {selectTerm("minimumBooking", "Minimum booking", options.minimumBookingOptions.map((o) => ({ value: o.code, label: o.label })))}
          {selectTerm("revisionsRounds", "Revisions", options.revisionsRounds.map((n) => ({ value: n, label: revisionsLabel(n) })))}
          {selectTerm("usageRightsMonths", "Usage rights", options.usageRightsMonths.map((n) => ({ value: n, label: usageRightsLabel(n) })))}
          {selectTerm("depositTerms", "Payment terms", options.depositTerms.map((o) => ({ value: o.value, label: o.label })))}
        </div>
        <Field id="apply-deliverables" label="What one booking includes" error={deliverablesError}>
          <input
            id="apply-deliverables"
            value={form.deliverables}
            onChange={(event) => patch({ deliverables: event.target.value })}
            className={controlClass(Boolean(deliverablesError)) + " h-10"}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Get paid to</SectionTitle>
        {options.paymentMethods.map(({ code }) => {
          const row = form.payout[code];
          return (
            <div key={code} className={cn("rounded-xl border p-3", row.on ? "border-primary-border bg-primary-light/40" : "border-border")}>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-heading">
                <input
                  type="checkbox"
                  checked={row.on}
                  onChange={(event) => patchPayout(code, { on: event.target.checked })}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                {PAYMENT_METHOD_LABELS[code]}
              </label>
              {row.on && (
                <>
                  <input
                    aria-label={`${PAYMENT_METHOD_LABELS[code]} number`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    value={row.number}
                    onChange={(event) => patchPayout(code, { number: event.target.value })}
                    placeholder="e.g. 677 123 456"
                    className={controlClass(Boolean(payoutError) && !isCameroonMobile(row.number)) + " mt-3 h-10"}
                  />
                  {row.savedLast3 && (
                    <p className="mt-1.5 text-xs text-muted">
                      A number ending {row.savedLast3} is saved. For your security it isn&apos;t shown, so enter it again to keep this account.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
        {payoutError && <p className="text-xs font-medium text-danger">{payoutError}</p>}
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-surface-alt px-4 py-3 text-sm text-heading">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
          />
          My details are accurate, and I understand my profile is reviewed by the Influencer On Hire team before it goes live.
        </label>
        {local.confirmed && <p className="mt-1.5 text-xs font-medium text-danger">{local.confirmed}</p>}
      </div>

      {otherSteps.length > 0 && (
        <p className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
          Some details in earlier steps are missing or invalid:{" "}
          {otherSteps.map((step, index) => (
            <span key={step}>
              {index > 0 && ", "}
              <a href={`/for-creators/apply/${step}`} className="font-semibold underline">
                {STEP_LABEL[step]}
              </a>
            </span>
          ))}
          .
        </p>
      )}

      <StepActions
        onBack={() => void handleBack()}
        submitLabel="Submit My Profile"
        busyLabel="Submitting…"
        busy={busy}
        error={notice?.text ?? null}
        {...(notice?.link ? { errorLink: notice.link } : {})}
      />
    </form>
  );
}
