"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { FiAlertCircle, FiChevronDown, FiImage, FiLock, FiUsers, FiX } from "react-icons/fi";
import { FieldError, FormLabel, fieldClass } from "@/components/shared/form-field";
import { cn } from "@/lib/utils";
import type {
  Campaign,
  CampaignFormErrors,
  CampaignFormField,
  CampaignFormOptions,
  CampaignFormValues,
} from "@/types/campaign";
import type { FilterOption } from "@/types/influencer-filters";
import { estimateReach, submitCampaign } from "../actions";
import {
  campaignDays,
  DELIVERABLES_MAX,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MIN_BUDGET,
  REQUIRED_FIELDS,
  TITLE_MAX,
  todayISO,
  validateCampaign,
} from "../campaign-form-rules";

const EMPTY_VALUES: CampaignFormValues = {
  title: "",
  niche: "",
  budget: "",
  startDate: "",
  endDate: "",
  deliverables: "",
  minEngagement: "any",
};

interface CampaignFormProps {
  options: CampaignFormOptions;
  onSuccess: (campaign: Campaign) => void;
}

function SectionTitle({ step, children }: { step: number; children: string }) {
  return (
    <h3 className="flex items-center gap-2.5 text-sm font-bold text-heading">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-xs text-primary">
        {step}
      </span>
      {children}
    </h3>
  );
}

function ChipGroup({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-heading">
        {legend}
        <span className="rounded-full bg-border-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
          Optional
        </span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-primary-border has-checked:border-primary has-checked:bg-primary has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-primary/30"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selected.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CampaignForm({ options, onSuccess }: CampaignFormProps) {
  const [today] = useState(() => todayISO());
  const [values, setValues] = useState<CampaignFormValues>(EMPTY_VALUES);
  const [ageRanges, setAgeRanges] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState("");
  const [touched, setTouched] = useState<Partial<Record<CampaignFormField, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<CampaignFormErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [refineOpen, setRefineOpen] = useState(false);
  const [reach, setReach] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const clientErrors = validateCampaign(values, today);
  const isComplete = (field: CampaignFormField) => !!values[field] && !clientErrors[field];
  const completedCount = REQUIRED_FIELDS.filter(isComplete).length;
  const errorFor = (field: CampaignFormField) =>
    ((touched[field] || attempted) && clientErrors[field]) || serverErrors[field] || undefined;
  const invalid = (field: CampaignFormField) =>
    errorFor(field) ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  function setValue(field: keyof CampaignFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  }
  const blur = (field: CampaignFormField) => () => setTouched((current) => ({ ...current, [field]: true }));

  // Live estimate of how many verified influencers this campaign would reach.
  useEffect(() => {
    if (!values.niche) return;
    let cancelled = false;
    estimateReach({ niche: values.niche, locations, minEngagement: values.minEngagement }).then((count) => {
      if (!cancelled) setReach(count);
    });
    return () => {
      cancelled = true;
    };
  }, [values.niche, values.minEngagement, locations]);
  const shownReach = values.niche ? reach : null;

  const imagePreviews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => imagePreviews.forEach((url) => URL.revokeObjectURL(url)), [imagePreviews]);

  function onImagesSelected(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    const accepted = picked.filter((file) => file.type.startsWith("image/") && file.size <= MAX_IMAGE_BYTES);
    const next = [...images, ...accepted].slice(0, MAX_IMAGES);
    if (accepted.length < picked.length) setImageError(`Only image files up to ${MAX_IMAGE_BYTES / 1024 / 1024} MB are accepted.`);
    else if (images.length + accepted.length > MAX_IMAGES) setImageError(`You can attach up to ${MAX_IMAGES} images.`);
    else setImageError("");
    setImages(next);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);

    const firstInvalid = REQUIRED_FIELDS.find((field) => clientErrors[field]);
    if (firstInvalid) {
      setFormMessage("Please fix the highlighted fields and try again.");
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    setFormMessage("");

    const formData = new FormData();
    for (const [field, value] of Object.entries(values)) formData.append(field, value);
    ageRanges.forEach((value) => formData.append("ageRanges", value));
    locations.forEach((value) => formData.append("locations", value));
    interests.forEach((value) => formData.append("interests", value));
    formData.append("referenceImageCount", String(images.length));

    startTransition(async () => {
      const result = await submitCampaign(formData);
      if (result.status === "success") {
        onSuccess(result.campaign);
        return;
      }
      setServerErrors(result.errors);
      setFormMessage(result.message);
    });
  }

  const days = campaignDays(values.startDate, values.endDate);
  const refinements = ageRanges.length + locations.length + interests.length + images.length + (values.minEngagement !== "any" ? 1 : 0);

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-heading">Required details</span>
          <span className={completedCount === REQUIRED_FIELDS.length ? "text-success" : "text-muted"}>
            {completedCount} of {REQUIRED_FIELDS.length} complete
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Required fields completed"
          aria-valuemin={0}
          aria-valuemax={REQUIRED_FIELDS.length}
          aria-valuenow={completedCount}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-light"
        >
          <div
            className="h-full rounded-full bg-success transition-[width] duration-300"
            style={{ width: `${(completedCount / REQUIRED_FIELDS.length) * 100}%` }}
          />
        </div>
      </div>

      {formMessage && (
        <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
          <FiAlertCircle className="mt-0.5 shrink-0" />
          {formMessage}
        </div>
      )}

      <div className="mt-8 space-y-5">
        <SectionTitle step={1}>Campaign basics</SectionTitle>

        <div>
          <FormLabel htmlFor="title" required complete={isComplete("title")}>
            Campaign Title
          </FormLabel>
          <input
            id="title"
            value={values.title}
            onChange={(event) => setValue("title", event.target.value)}
            onBlur={blur("title")}
            maxLength={TITLE_MAX}
            placeholder="e.g. Summer Glow Launch"
            className={cn(fieldClass(!!errorFor("title")), "h-11")}
            {...invalid("title")}
          />
          <FieldError id="title-error" message={errorFor("title")} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FormLabel htmlFor="niche" required complete={isComplete("niche")}>
              Niche
            </FormLabel>
            <div className="relative">
              <select
                id="niche"
                value={values.niche}
                onChange={(event) => setValue("niche", event.target.value)}
                onBlur={blur("niche")}
                className={cn(fieldClass(!!errorFor("niche")), "h-11 appearance-none pr-10", !values.niche && "text-muted")}
                {...invalid("niche")}
              >
                <option value="">Select a niche</option>
                {options.niches.map((niche) => (
                  <option key={niche.value} value={niche.value}>
                    {niche.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <FieldError id="niche-error" message={errorFor("niche")} />
          </div>

          <div>
            <FormLabel htmlFor="budget" required complete={isComplete("budget")}>
              Budget / Price (FCFA)
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
              <p className="mt-1.5 text-xs text-muted">Minimum {MIN_BUDGET.toLocaleString("en-US")} FCFA.</p>
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
            <input
              id="startDate"
              type="date"
              min={today}
              value={values.startDate}
              onChange={(event) => setValue("startDate", event.target.value)}
              onBlur={blur("startDate")}
              className={cn(fieldClass(!!errorFor("startDate")), "h-11")}
              {...invalid("startDate")}
            />
            <FieldError id="startDate-error" message={errorFor("startDate")} />
          </div>
          <div>
            <FormLabel htmlFor="endDate" required complete={isComplete("endDate")}>
              End Date
            </FormLabel>
            <input
              id="endDate"
              type="date"
              min={values.startDate || today}
              value={values.endDate}
              onChange={(event) => setValue("endDate", event.target.value)}
              onBlur={blur("endDate")}
              className={cn(fieldClass(!!errorFor("endDate")), "h-11")}
              {...invalid("endDate")}
            />
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
          <textarea
            id="deliverables"
            rows={4}
            value={values.deliverables}
            onChange={(event) => setValue("deliverables", event.target.value)}
            onBlur={blur("deliverables")}
            maxLength={DELIVERABLES_MAX}
            placeholder="e.g. 1 Instagram story, 2 TikTok posts, 1 YouTube mention"
            className={cn(fieldClass(!!errorFor("deliverables")), "resize-y py-3")}
            {...invalid("deliverables")}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError id="deliverables-error" message={errorFor("deliverables")} />
            <span className="ml-auto text-xs text-muted" aria-live="polite">
              {values.deliverables.length}/{DELIVERABLES_MAX}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border bg-surface-alt">
        <button
          type="button"
          onClick={() => setRefineOpen((open) => !open)}
          aria-expanded={refineOpen}
          aria-controls="refine-reach"
          className="flex w-full items-center justify-between gap-3 rounded-xl p-5 text-left"
        >
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-bold text-heading">Refine Your Reach</span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              Optional · Can be skipped
            </span>
            {refinements > 0 && (
              <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-[10px] font-bold text-primary">
                {refinements} applied
              </span>
            )}
          </span>
          <FiChevronDown className={cn("shrink-0 text-muted transition-transform", refineOpen && "rotate-180")} />
        </button>

        <div id="refine-reach" hidden={!refineOpen} className="space-y-5 border-t border-border p-5">
          <div>
            <FormLabel htmlFor="minEngagement" optional>
              Minimum Engagement Rate
            </FormLabel>
            <div className="relative">
              <select
                id="minEngagement"
                value={values.minEngagement}
                onChange={(event) => setValue("minEngagement", event.target.value)}
                className={cn(fieldClass(!!errorFor("minEngagement")), "h-11 appearance-none pr-10")}
              >
                {options.engagementLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <FieldError id="minEngagement-error" message={errorFor("minEngagement")} />
          </div>

          <ChipGroup legend="Target audience — age range" options={options.ageRanges} selected={ageRanges} onChange={setAgeRanges} />
          <ChipGroup legend="Target audience — location" options={options.locations} selected={locations} onChange={setLocations} />
          <ChipGroup legend="Target audience — interests" options={options.interests} selected={interests} onChange={setInterests} />

          <div>
            <FormLabel htmlFor="referenceImages" optional>
              Campaign Reference Images
            </FormLabel>
            <label
              htmlFor="referenceImages"
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center text-xs text-muted transition-colors hover:border-primary-border has-focus-visible:ring-2 has-focus-visible:ring-primary/30"
            >
              <FiImage size={20} className="text-primary" />
              <span className="font-semibold text-heading">Click to add images</span>
              <span>
                Up to {MAX_IMAGES} images, {MAX_IMAGE_BYTES / 1024 / 1024} MB each
              </span>
              <input
                id="referenceImages"
                type="file"
                accept="image/*"
                multiple
                onChange={onImagesSelected}
                className="sr-only"
              />
            </label>
            {imageError && <FieldError id="referenceImages-error" message={imageError} />}
            {images.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {images.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                    <Image src={imagePreviews[index]} alt={file.name} fill unoptimized sizes="64px" className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((current) => current.filter((_, position) => position !== index))}
                      aria-label={`Remove ${file.name}`}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-heading/80 text-white hover:bg-heading"
                    >
                      <FiX size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {shownReach !== null && (
        <p
          aria-live="polite"
          className="mt-6 flex items-start gap-2.5 rounded-lg bg-primary-light px-4 py-3 text-sm text-body"
        >
          <FiUsers className="mt-0.5 shrink-0 text-primary" />
          {shownReach > 0 ? (
            <span>
              Right now this would reach <strong className="text-heading">{shownReach}</strong> verified{" "}
              {shownReach === 1 ? "influencer" : "influencers"}.
            </span>
          ) : (
            <span>No verified influencers match these criteria yet. Try widening the location or engagement.</span>
          )}
        </p>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
        >
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
          {pending ? "Posting campaign..." : "Post Your Campaign Now"}
        </button>
        <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-muted">
          <FiLock className="mt-0.5 shrink-0" />
          No charge until an influencer accepts and funds are placed in escrow.
        </p>
      </div>
    </form>
  );
}
