"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  formatCameroonPhone,
  formatFrs,
  formatNumber,
  isCameroonMobile,
  parseAmount,
} from "@/lib/format";
import {
  getCreatorApplicationDraft,
  saveCreatorRates,
  submitCreatorApplication,
} from "@/services/creator-application.service";
import type {
  CreatorApplicationOptions,
  CreatorRates,
  MobileMoneyMethod,
  PlatformAudience,
  SocialPlatform,
} from "@/types/creator-application";
import { Field, MissingStep, PlatformIcon, SectionTitle, StepActions, controlClass } from "../apply-ui";

type Status = "loading" | "missing" | "ready";
type Terms = Pick<CreatorRates, "minimumBooking" | "deliverables" | "revisions" | "usageRights" | "depositTerms">;
const METHODS: MobileMoneyMethod[] = ["mtn_momo", "orange_money"];

interface Errors {
  prices?: Partial<Record<SocialPlatform, string>>;
  deliverables?: string;
  payout?: string;
  confirmed?: string;
}

export function RatesStep({ options }: { options: CreatorApplicationOptions }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [platforms, setPlatforms] = useState<PlatformAudience[]>([]);
  const [prices, setPrices] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [terms, setTerms] = useState<Terms>({
    minimumBooking: options.minimumBooking[1] ?? options.minimumBooking[0],
    deliverables: options.defaultDeliverables,
    revisions: options.revisions[1] ?? options.revisions[0],
    usageRights: options.usageRights[1] ?? options.usageRights[0],
    depositTerms: options.depositTerms[0],
  });
  const [payout, setPayout] = useState<Record<MobileMoneyMethod, { on: boolean; number: string }>>({
    mtn_momo: { on: true, number: "" },
    orange_money: { on: false, number: "" },
  });
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getCreatorApplicationDraft().then((draft) => {
      if (!draft.basics) return setStatus("missing");
      if (!draft.audience) return router.replace("/for-creators/apply/audience");
      setPlatforms(draft.audience.platforms);
      if (draft.rates) {
        const saved = draft.rates;
        setPrices(Object.fromEntries(saved.prices.map((p) => [p.platform, formatNumber(p.price)])));
        setTerms({
          minimumBooking: saved.minimumBooking,
          deliverables: saved.deliverables,
          revisions: saved.revisions,
          usageRights: saved.usageRights,
          depositTerms: saved.depositTerms,
        });
        setPayout((current) => {
          const next = { ...current, mtn_momo: { on: false, number: "" } };
          for (const account of saved.payoutAccounts) next[account.method] = { on: true, number: account.number };
          return next;
        });
      }
      setStatus("ready");
    });
  }, [router]);

  const labelOf = (id: SocialPlatform) => options.platforms.find((p) => p.id === id)?.label ?? id;
  const validPrices = platforms.map((p) => parseAmount(prices[p.platform] ?? "")).filter((n) => Number.isFinite(n) && n > 0);
  const fromPrice = validPrices.length ? Math.min(...validPrices) : null;

  function validate(): Errors {
    const errors: Errors = {};
    const priceErrors: Partial<Record<SocialPlatform, string>> = {};
    for (const p of platforms) {
      const value = parseAmount(prices[p.platform] ?? "");
      if (!Number.isFinite(value) || value < options.minPricePerPlatform) {
        priceErrors[p.platform] = `Set at least ${formatNumber(options.minPricePerPlatform)} Frs.`;
      }
    }
    if (Object.keys(priceErrors).length) errors.prices = priceErrors;
    if (!terms.deliverables.trim()) errors.deliverables = "Describe what one booking includes.";
    const accounts = METHODS.filter((m) => payout[m].on);
    if (accounts.length === 0) errors.payout = "Choose at least one mobile money account.";
    else if (accounts.some((m) => !isCameroonMobile(payout[m].number))) {
      errors.payout = "Use a 9-digit Cameroon number starting with 6 for each account.";
    }
    if (!confirmed) errors.confirmed = "Please confirm your details are accurate.";
    return errors;
  }

  const errors = attempted ? validate() : {};

  function collect(): CreatorRates {
    return {
      prices: platforms.map((p) => ({ platform: p.platform, price: parseAmount(prices[p.platform] ?? "") || 0 })),
      ...terms,
      deliverables: terms.deliverables.trim(),
      payoutAccounts: METHODS.filter((m) => payout[m].on).map((m) => ({ method: m, number: formatCameroonPhone(payout[m].number) })),
    };
  }

  async function handleBack() {
    await saveCreatorRates(collect());
    router.push("/for-creators/apply/audience");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(validate()).length) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const application = await submitCreatorApplication(collect());
      router.push(`/for-creators/apply/submitted?id=${encodeURIComponent(application.id)}`);
    } catch {
      setSubmitError("We couldn't submit your profile. Check your connection and try again.");
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" aria-busy="true" />;
  if (status === "missing") return <MissingStep href="/for-creators/apply/profile" label="Go to step 1" />;

  const selectTerm = (key: keyof Terms, choices: string[], label: string) => (
    <Field id={`apply-${key}`} label={label}>
      <select
        id={`apply-${key}`}
        value={terms[key]}
        onChange={(event) => setTerms((current) => ({ ...current, [key]: event.target.value }))}
        className={controlClass() + " h-10 cursor-pointer"}
      >
        {choices.map((choice) => (
          <option key={choice}>{choice}</option>
        ))}
      </select>
    </Field>
  );

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SectionTitle>Your price per platform</SectionTitle>
        <p className="-mt-2 text-sm text-body">What a brand pays for one booking on each platform, in FCFA.</p>
        {platforms.map((p) => (
          <div key={p.platform} className="flex flex-col gap-1">
            <label htmlFor={`price-${p.platform}`} className="flex items-center gap-3">
              <PlatformIcon platform={p.platform} decorative />
              <span className="w-24 text-sm font-semibold text-heading">{labelOf(p.platform)}</span>
              <span className="relative flex-1">
                <input
                  id={`price-${p.platform}`}
                  inputMode="numeric"
                  value={prices[p.platform] ?? ""}
                  onChange={(event) => setPrices((current) => ({ ...current, [p.platform]: event.target.value }))}
                  placeholder="e.g. 400,000"
                  className={controlClass(Boolean(errors.prices?.[p.platform])) + " h-10 pr-12"}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">Frs</span>
              </span>
            </label>
            {errors.prices?.[p.platform] && <p className="pl-[8.5rem] text-xs font-medium text-danger">{errors.prices[p.platform]}</p>}
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
          {selectTerm("minimumBooking", options.minimumBooking, "Minimum booking")}
          {selectTerm("revisions", options.revisions, "Revisions")}
          {selectTerm("usageRights", options.usageRights, "Usage rights")}
          {selectTerm("depositTerms", options.depositTerms, "Payment terms")}
        </div>
        <Field id="apply-deliverables" label="What one booking includes" error={errors.deliverables}>
          <input
            id="apply-deliverables"
            value={terms.deliverables}
            onChange={(event) => setTerms((current) => ({ ...current, deliverables: event.target.value }))}
            className={controlClass(Boolean(errors.deliverables)) + " h-10"}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Get paid to</SectionTitle>
        {METHODS.map((method) => (
          <div key={method} className={cn("rounded-xl border p-3", payout[method].on ? "border-primary-border bg-primary-light/40" : "border-border")}>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-heading">
              <input
                type="checkbox"
                checked={payout[method].on}
                onChange={(event) => setPayout((current) => ({ ...current, [method]: { ...current[method], on: event.target.checked } }))}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              {PAYMENT_METHOD_LABELS[method]}
            </label>
            {payout[method].on && (
              <input
                aria-label={`${PAYMENT_METHOD_LABELS[method]} number`}
                type="tel"
                inputMode="tel"
                value={payout[method].number}
                onChange={(event) => setPayout((current) => ({ ...current, [method]: { ...current[method], number: event.target.value } }))}
                placeholder="e.g. 677 123 456"
                className={controlClass(Boolean(errors.payout) && !isCameroonMobile(payout[method].number)) + " mt-3 h-10"}
              />
            )}
          </div>
        ))}
        {errors.payout && <p className="text-xs font-medium text-danger">{errors.payout}</p>}
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
        {errors.confirmed && <p className="mt-1.5 text-xs font-medium text-danger">{errors.confirmed}</p>}
      </div>

      <StepActions onBack={() => void handleBack()} submitLabel="Submit My Profile" busyLabel="Submitting…" busy={saving} error={submitError} />
    </form>
  );
}
