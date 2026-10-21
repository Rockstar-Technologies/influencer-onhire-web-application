"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiAlertCircle, FiCheckCircle, FiChevronDown, FiImage, FiLock } from "react-icons/fi";
import { FieldError, FormLabel, fieldClass } from "@/components/shared/form-field";
import { saveCampaignAction } from "@/features/brand-campaigns/actions";
import type { CampaignFailure, FailureNotice } from "@/features/brand-campaigns/failure";
import { campaignFailureNotice } from "@/features/brand-campaigns/failure";
import {
  DELIVERABLES_MAX,
  REQUIRED_FIELDS,
  TITLE_MAX,
  campaignDays,
  campaignToApi,
  todayISO,
  validateCampaignForm,
} from "@/features/brand-campaigns/mapping";
import type { CampaignForm as CampaignFormValues, CampaignFormErrors } from "@/features/brand-campaigns/mapping";
import type { CampaignOptions } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";

interface Props {
  options: CampaignOptions;
  /** The saved draft being edited (`id`), or null for a new campaign. */
  draftId: string | null;
  initial: CampaignFormValues;
}

type Chip = { value: string; label: string };

function SectionTitle({ step, children }: { step: number; children: string }) {
  return (
    <h3 className="flex items-center gap-2.5 text-sm font-bold text-heading">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-xs text-primary">{step}</span>
      {children}
    </h3>
  );
}

function ChipGroup({ legend, options, selected, onChange, error }: { legend: string; options: Chip[]; selected: string[]; onChange: (next: string[]) => void; error?: string | undefined }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-heading">
        {legend}
        <span className="rounded-full bg-border-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Optional</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-primary-border has-checked:border-primary has-checked:bg-primary-light has-checked:text-primary has-focus-visible:ring-2 has-focus-visible:ring-primary/40"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selected.includes(option.value)}
              onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

export function CampaignForm({ options, draftId: initialDraftId, initial }: Props) {
  const router = useRouter();
  const [today] = useState(() => todayISO(-1)); // one day of leniency for time zones; the API applies the Africa/Douala date
  const [values, setValues] = useState<CampaignFormValues>(initial);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const [touched, setTouched] = useState<Partial<Record<keyof CampaignFormValues, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<CampaignFormErrors>({});
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [refineOpen, setRefineOpen] = useState(initial.ageRanges.length + initial.cities.length + initial.interests.length > 0 || initial.minEngagement !== "any");
  const inFlight = useRef(false); // set synchronously: state alone cannot stop two submits fired in the same tick

  const clientErrors = validateCampaignForm(values, options, today);
  const isComplete = (field: keyof CampaignFormValues) => Boolean(values[field]) && !clientErrors[field];
  const completedCount = REQUIRED_FIELDS.filter(isComplete).length;
  const errorFor = (field: keyof CampaignFormValues) => ((touched[field] || attempted) && clientErrors[field]) || serverErrors[field] || undefined;
  const invalid = (field: keyof CampaignFormValues) => (errorFor(field) ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {});

  function setValue<K extends keyof CampaignFormValues>(field: K, value: CampaignFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setSavedMessage(null);
  }
  const blur = (field: keyof CampaignFormValues) => () => setTouched((current) => ({ ...current, [field]: true }));

  async function save(submit: boolean) {
    if (inFlight.current) return; // a double click or a repeated Enter must not send a second request
    setAttempted(true);
    setNotice(null);
    setSavedMessage(null);
    const firstInvalid = REQUIRED_FIELDS.find((field) => clientErrors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(submit ? "submit" : "draft");
    try {
      const result = await saveCampaignAction({ id: draftId, campaign: campaignToApi(values), submit });
      if (result.ok) {
        setDraftId(result.campaign.id);
        if (result.submitted) {
          router.push(`/brand/campaigns/${result.campaign.id}?submitted=1`);
          return;
        }
        setSavedMessage("Draft saved. You can keep editing, or submit it for review when you are ready.");
        router.replace(`/campaigns/new?draft=${result.campaign.id}`, { scroll: false });
      } else {
        fail(result.error, result.savedId);
      }
    } catch {
      fail({ kind: "unavailable", requestId: null }, null);
    }
    inFlight.current = false;
    setBusy(null);
  }

  function fail(error: CampaignFailure, savedId: string | null) {
    if (savedId) {
      // The draft exists even though submitting failed: later saves update it instead of creating a second one.
      setDraftId(savedId);
      router.replace(`/campaigns/new?draft=${savedId}`, { scroll: false });
    }
    setServerErrors(error.kind === "validation" ? error.fields : {});
    setNotice(campaignFailureNotice(error, draftId ? `/campaigns/new?draft=${draftId}` : "/campaigns/new", { savedDraft: Boolean(savedId) }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(true);
  }

  const days = campaignDays(values.startDate, values.endDate);
  const refinements = values.ageRanges.length + values.cities.length + values.interests.length + (values.minEngagement !== "any" ? 1 : 0);
  const engagementChoices = [{ value: "any", label: "No minimum" }, ...options.engagementLevels.map((level) => ({ value: String(level.minPct), label: level.label }))];
  const generalError = serverErrors.form;

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-heading">Required details</span>
          <span className={completedCount === REQUIRED_FIELDS.length ? "text-success" : "text-muted"}>
            {completedCount} of {REQUIRED_FIELDS.length} complete
          </span>
        </div>
        <div role="progressbar" aria-label="Required fields completed" aria-valuemin={0} aria-valuemax={REQUIRED_FIELDS.length} aria-valuenow={completedCount} className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-light">
          <div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${(completedCount / REQUIRED_FIELDS.length) * 100}%` }} />
        </div>
        {draftId && <p className="mt-2 text-xs text-muted">Editing a saved draft.</p>}
      </div>

      {(notice || generalError) && (
        <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
          <FiAlertCircle className="mt-0.5 shrink-0" />
          <span>
            {notice?.text ?? generalError}
            {notice?.link && (
              <>
                {" "}
                <Link href={notice.link.href} className="font-semibold underline">
                  {notice.link.label}
                </Link>
              </>
            )}
          </span>
        </div>
      )}
      {savedMessage && (
        <div role="status" className="mt-6 flex items-start gap-2.5 rounded-lg bg-success-light px-4 py-3 text-sm text-success-strong">
          <FiCheckCircle className="mt-0.5 shrink-0" />
          <span>
            {savedMessage}{" "}
            {draftId && (
              <Link href={`/brand/campaigns/${draftId}`} className="font-semibold underline">
                View campaign
              </Link>
            )}
          </span>
        </div>
      )}

      <div className="mt-8 space-y-5">
        <SectionTitle step={1}>Campaign basics</SectionTitle>
        <div>
          <FormLabel htmlFor="title" required complete={isComplete("title")}>
            Campaign Title
          </FormLabel>
          <input id="title" value={values.title} onChange={(event) => setValue("title", event.target.value)} onBlur={blur("title")} maxLength={TITLE_MAX} placeholder="e.g. Summer Glow Launch" className={cn(fieldClass(!!errorFor("title")), "h-11")} {...invalid("title")} />
          <FieldError id="title-error" message={errorFor("title")} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FormLabel htmlFor="niche" required complete={isComplete("niche")}>
              Niche
            </FormLabel>
            <div className="relative">
              <select id="niche" value={values.niche} onChange={(event) => setValue("niche", event.target.value)} onBlur={blur("niche")} className={cn(fieldClass(!!errorFor("niche")), "h-11 appearance-none pr-10", !values.niche && "text-muted")} {...invalid("niche")}>
                <option value="">Select a niche</option>
                {options.niches.map((niche) => (
                  <option key={niche.slug} value={niche.slug}>
                    {niche.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <FieldError id="niche-error" message={errorFor("niche")} />
          </div>

          <div>
            <FormLabel htmlFor="budget" required complete={isComplete("budget")}>
              Maximum budget per creator (FCFA)
            </FormLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">FCFA</span>
              <input
                id="budget"
                inputMode="numeric"
                autoComplete="off"
                value={values.budget ? Number(values.budget).toLocaleString("en-US") : ""}
                onChange={(event) => setValue("budget", event.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={blur("budget")}
                placeholder="500,000"
                className={cn(fieldClass(!!errorFor("budget")), "h-11 pl-14")}
                {...invalid("budget")}
              />
            </div>
            {errorFor("budget") ? (
              <FieldError id="budget-error" message={errorFor("budget")} />
            ) : (
              <p className="mt-1.5 text-xs text-muted">
                The most you will pay one creator; it is not split between creators. Minimum {options.limits.budgetMinXaf.toLocaleString("en-US")} FCFA.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <SectionTitle step={2}>Timeline</SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FormLabel htmlFor="startDate" required complete={isComplete("startDate")}>
              Start Date
            </FormLabel>
            <input id="startDate" type="date" min={today} value={values.startDate} onChange={(event) => setValue("startDate", event.target.value)} onBlur={blur("startDate")} className={cn(fieldClass(!!errorFor("startDate")), "h-11")} {...invalid("startDate")} />
            <FieldError id="startDate-error" message={errorFor("startDate")} />
          </div>
          <div>
            <FormLabel htmlFor="endDate" required complete={isComplete("endDate")}>
              End Date
            </FormLabel>
            <input id="endDate" type="date" min={values.startDate || today} value={values.endDate} onChange={(event) => setValue("endDate", event.target.value)} onBlur={blur("endDate")} className={cn(fieldClass(!!errorFor("endDate")), "h-11")} {...invalid("endDate")} />
            {errorFor("endDate") ? (
              <FieldError id="endDate-error" message={errorFor("endDate")} />
            ) : (
              days && (
                <p className="mt-1.5 text-xs font-medium text-success">
                  Campaign runs for {days} {days === 1 ? "day" : "days"}.
                </p>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <SectionTitle step={3}>What you expect</SectionTitle>
        <div>
          <FormLabel htmlFor="deliverables" required complete={isComplete("deliverables")}>
            Expectations / Deliverables
          </FormLabel>
          <textarea id="deliverables" rows={4} value={values.deliverables} onChange={(event) => setValue("deliverables", event.target.value)} onBlur={blur("deliverables")} maxLength={DELIVERABLES_MAX} placeholder="e.g. 1 Instagram story, 2 TikTok posts, 1 YouTube mention" className={cn(fieldClass(!!errorFor("deliverables")), "resize-y py-3")} {...invalid("deliverables")} />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError id="deliverables-error" message={errorFor("deliverables")} />
            <span className="ml-auto text-xs text-muted" aria-live="polite">
              {values.deliverables.length}/{DELIVERABLES_MAX}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border bg-surface-alt">
        <button type="button" onClick={() => setRefineOpen((open) => !open)} aria-expanded={refineOpen} aria-controls="refine-reach" className="flex w-full items-center justify-between gap-3 rounded-xl p-5 text-left">
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-bold text-heading">Refine Your Reach</span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Optional · Can be skipped</span>
            {refinements > 0 && <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-[10px] font-bold text-primary">{refinements} applied</span>}
          </span>
          <FiChevronDown className={cn("shrink-0 text-muted transition-transform", refineOpen && "rotate-180")} />
        </button>

        <div id="refine-reach" hidden={!refineOpen} className="space-y-5 border-t border-border p-5">
          <div>
            <FormLabel htmlFor="minEngagement" optional>
              Minimum Engagement Rate
            </FormLabel>
            <div className="relative">
              <select id="minEngagement" value={values.minEngagement} onChange={(event) => setValue("minEngagement", event.target.value as CampaignFormValues["minEngagement"])} className={cn(fieldClass(!!errorFor("minEngagement")), "h-11 appearance-none pr-10")}>
                {engagementChoices.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <FieldError id="minEngagement-error" message={errorFor("minEngagement")} />
          </div>

          <ChipGroup legend="Target audience — age range" options={options.ageRanges.map((a) => ({ value: a.code, label: a.label }))} selected={values.ageRanges} onChange={(next) => setValue("ageRanges", next as CampaignFormValues["ageRanges"])} error={errorFor("ageRanges")} />
          <ChipGroup legend="Target audience — location" options={options.cities.map((c) => ({ value: c.slug, label: c.name }))} selected={values.cities} onChange={(next) => setValue("cities", next)} error={errorFor("cities")} />
          <ChipGroup legend="Target audience — interests" options={options.interests.map((i) => ({ value: i.slug, label: i.name }))} selected={values.interests} onChange={(next) => setValue("interests", next)} error={errorFor("interests")} />

          <div className="rounded-lg border border-border bg-surface px-4 py-4 text-xs text-muted">
            <p className="flex items-center gap-2 font-semibold text-heading">
              <FiImage className="text-primary" aria-hidden /> Campaign reference images
            </p>
            <p className="mt-1.5">Image upload isn&apos;t available yet, so your campaign is saved without images. You can still describe what you want in the deliverables.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={busy !== null}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-semibold text-heading transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "draft" ? "Saving draft…" : "Save draft"}
        </button>
        <button
          type="submit"
          disabled={busy !== null}
          className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "submit" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
          {busy === "submit" ? "Submitting…" : "Submit for review"}
        </button>
      </div>
      <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-muted">
        <FiLock className="mt-0.5 shrink-0" />
        No charge until a creator accepts and the funds are placed in escrow.
      </p>
    </form>
  );
}
