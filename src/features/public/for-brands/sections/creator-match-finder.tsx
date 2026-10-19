"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatNumber, parseAmount } from "@/lib/format";
import { previewCampaignMatches } from "@/services/campaigns.service";
import type { CampaignMatchPreview, EngagementRateOption, MatchFilterOptions, NewCampaignInput } from "@/types/campaign";

interface Filters {
  niche: string;
  city: string;
  minEngagementRate: number;
}

function toInput(filters: Filters, budget = 0): NewCampaignInput {
  return {
    title: "",
    budget,
    startDate: "",
    endDate: "",
    deliverables: "",
    minEngagementRate: filters.minEngagementRate,
    location: filters.city,
    interests: filters.niche,
    referenceImageNames: [],
  };
}

const selectClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-heading transition-colors hover:border-primary-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CreatorMatchFinder({
  options,
  engagementOptions,
}: {
  options: MatchFilterOptions;
  engagementOptions: EngagementRateOption[];
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ niche: "", city: "", minEngagementRate: 3 });
  const [result, setResult] = useState<{ key: string; preview: CampaignMatchPreview } | null>(null);
  const [budget, setBudget] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filterKey = JSON.stringify(filters);
  const loading = result?.key !== filterKey;

  useEffect(() => {
    let cancelled = false;
    previewCampaignMatches(toInput(filters)).then((preview) => {
      if (!cancelled) setResult({ key: JSON.stringify(filters), preview });
    });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseAmount(budget);
    if (!budget.trim() || !Number.isFinite(amount) || amount <= 0) {
      setBudgetError("Enter a budget above 0 FCFA.");
      return;
    }
    setBudgetError("");
    setSubmitting(true);
    // The estimate above is a demonstration. The real campaign is created in the campaign form; only the budget carries over.
    router.push(`/campaigns/new?budget=${Math.trunc(amount)}`);
  }

  const preview = result?.preview;
  const matchedCount = preview?.summary.matchedCount ?? 0;

  return (
    <div id="find-creators" className="scroll-mt-24 rounded-2xl bg-surface p-6 shadow-2xl sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-heading">Find Your Creators</h2>
        <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">Live preview</span>
      </div>
      <p className="mt-1 text-sm text-body">Pick who you want to reach — we&apos;ll show how many verified creators match.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-heading">Niche</span>
          <select className={selectClass} value={filters.niche} onChange={(e) => update("niche", e.target.value)}>
            <option value="">All niches</option>
            {options.niches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-heading">City</span>
          <select className={selectClass} value={filters.city} onChange={(e) => update("city", e.target.value)}>
            <option value="">All cities</option>
            {options.cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-heading">Engagement</span>
          <select
            className={selectClass}
            value={filters.minEngagementRate}
            onChange={(e) => update("minEngagementRate", Number(e.target.value))}
          >
            {engagementOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={cn(
          "mt-5 rounded-xl border border-border bg-surface-alt p-4 transition-opacity",
          loading && "opacity-60"
        )}
        aria-live="polite"
      >
        <p className="text-sm text-body">
          <span className="text-2xl font-extrabold text-primary">{formatNumber(matchedCount)}</span>{" "}
          verified creator{matchedCount === 1 ? "" : "s"} match
        </p>

        {preview && preview.topMatches.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {preview.topMatches.map((match) => (
              <li
                key={match.id}
                className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 transition-shadow hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                  {match.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-heading">{match.name}</span>
                  <span className="block text-xs text-muted">
                    {match.niche} · {match.city}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-bold text-heading">{match.engagementRate}%</span>
                  <span
                    className={cn(
                      "block text-[11px] font-semibold",
                      match.strength === "strong" ? "text-success" : "text-primary"
                    )}
                  >
                    {match.strength === "strong" ? "Strong match" : "Good match"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          !loading && (
            <p className="mt-2 text-xs text-muted">No creators match yet — try another city or a lower engagement rate.</p>
          )
        )}
      </div>

      <form onSubmit={handleStart} noValidate className="mt-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-heading">Your budget (FCFA)</span>
          <input
            inputMode="numeric"
            placeholder="e.g. 300,000"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            aria-invalid={Boolean(budgetError)}
            className={cn(selectClass, budgetError && "border-danger focus:border-danger focus:ring-danger/20")}
          />
        </label>
        {budgetError && <p className="mt-1.5 text-xs text-danger">{budgetError}</p>}
        <button
          type="submit"
          disabled={submitting || matchedCount === 0}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {submitting ? "Preparing your brief…" : "Start Campaign With These Creators →"}
        </button>
        <p className="mt-2 text-center text-xs text-muted">Free to post · You only pay once a creator accepts</p>
      </form>
    </div>
  );
}
