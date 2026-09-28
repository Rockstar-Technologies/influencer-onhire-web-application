"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Button } from "@/components/shared/button";
import { cn } from "@/lib/utils";
import {
  createCampaign,
  deleteCampaignDraft,
  getCampaignDraft,
  saveCampaignDraft,
} from "@/services/campaigns.service";
import type { CampaignDraft, EngagementRateOption, NewCampaignInput } from "@/types/campaign";

interface FormValues {
  title: string;
  budget: string;
  startDate: string;
  endDate: string;
  deliverables: string;
  durationDays: string;
  minEngagementRate: string;
  ageRange: string;
  location: string;
  interests: string;
}

type FieldName = keyof FormValues;
type FormErrors = Partial<Record<FieldName, string>>;

const REQUIRED_FIELDS: FieldName[] = ["title", "budget", "startDate", "endDate", "deliverables"];

const INITIAL_VALUES: FormValues = {
  title: "",
  budget: "",
  startDate: "",
  endDate: "",
  deliverables: "",
  durationDays: "",
  minEngagementRate: "3",
  ageRange: "",
  location: "",
  interests: "",
};

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.title.trim()) errors.title = "Give your campaign a title.";

  const budget = Number(values.budget.replace(/[\s,]/g, ""));
  if (!values.budget.trim()) errors.budget = "Enter your budget in FCFA.";
  else if (!Number.isFinite(budget) || budget <= 0) errors.budget = "Budget must be a number above 0.";

  if (!values.startDate) errors.startDate = "Pick a start date.";
  if (!values.endDate) errors.endDate = "Pick an end date.";
  else if (values.startDate && values.endDate < values.startDate) {
    errors.endDate = "End date must be on or after the start date.";
  }

  if (!values.deliverables.trim()) errors.deliverables = "Describe what the influencer should deliver.";

  if (values.durationDays.trim()) {
    const days = Number(values.durationDays);
    if (!Number.isInteger(days) || days <= 0) errors.durationDays = "Use a whole number of days, e.g. 14.";
  }

  if (values.ageRange.trim() && !/^\d{2}\s*[-–]\s*\d{2}$/.test(values.ageRange.trim())) {
    errors.ageRange = "Use a range like 18–34.";
  }

  return errors;
}

function fromDraft(draft: CampaignDraft): FormValues {
  return {
    title: draft.title,
    budget: draft.budget.toLocaleString("en-US"),
    startDate: draft.startDate,
    endDate: draft.endDate,
    deliverables: draft.deliverables,
    durationDays: draft.durationDays ? String(draft.durationDays) : "",
    minEngagementRate: String(draft.minEngagementRate ?? 0),
    ageRange: draft.ageRange ?? "",
    location: draft.location ?? "",
    interests: draft.interests ?? "",
  };
}

function toInput(values: FormValues, imageNames: string[]): NewCampaignInput {
  const optionalText = (value: string) => value.trim() || undefined;
  const engagement = Number(values.minEngagementRate);

  return {
    title: values.title.trim(),
    budget: Number(values.budget.replace(/[\s,]/g, "")),
    startDate: values.startDate,
    endDate: values.endDate,
    deliverables: values.deliverables.trim(),
    durationDays: values.durationDays.trim() ? Number(values.durationDays) : undefined,
    minEngagementRate: engagement > 0 ? engagement : undefined,
    ageRange: optionalText(values.ageRange),
    location: optionalText(values.location),
    interests: optionalText(values.interests),
    referenceImageNames: imageNames,
  };
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OptionalBadge({ children = "Optional" }: { children?: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      {children}
    </span>
  );
}

interface FieldProps {
  id: FieldName | "images";
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  valid?: boolean;
  children: ReactNode;
}

function Field({ id, label, required, optional, error, valid, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-heading">
        <span>
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        {optional && <OptionalBadge />}
      </label>
      <div className="relative">
        {children}
        {valid && (
          <CheckIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-success" />
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function controlClass(state: "idle" | "valid" | "error") {
  return cn(
    "w-full rounded-lg border bg-surface px-3 text-sm text-heading placeholder:text-muted/70 outline-none transition-colors",
    "focus:border-primary focus:ring-2 focus:ring-primary/15",
    state === "idle" && "border-border",
    state === "valid" && "border-success/60",
    state === "error" && "border-danger ring-2 ring-danger/10"
  );
}

export function CampaignForm({
  engagementOptions,
  draftId,
}: {
  engagementOptions: EngagementRateOption[];
  draftId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [images, setImages] = useState<File[]>([]);
  // Image names carried over from a draft, used until the brand picks new files.
  const [draftImageNames, setDraftImageNames] = useState<string[]>([]);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    getCampaignDraft(draftId).then((draft) => {
      if (cancelled || !draft) return;
      setValues(fromDraft(draft));
      setDraftImageNames(draft.referenceImageNames);
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const imageNames = images.length ? images.map((file) => file.name) : draftImageNames;
  const errors = validate(values);
  const isValid = Object.keys(errors).length === 0;

  const showError = (name: FieldName) => (touched[name] || attempted) && errors[name];
  const fieldState = (name: FieldName): "idle" | "valid" | "error" => {
    if (showError(name)) return "error";
    return values[name].trim() && !errors[name] ? "valid" : "idle";
  };

  const bind = (name: FieldName) => ({
    id: name,
    name,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
    onBlur: () => setTouched((current) => ({ ...current, [name]: true })),
    "aria-invalid": Boolean(showError(name)),
    "aria-describedby": showError(name) ? `${name}-error` : undefined,
  });

  const fieldProps = (name: FieldName) => ({
    id: name,
    error: showError(name) || undefined,
    valid: fieldState(name) === "valid" && name !== "minEngagementRate",
  });

  function focusFirstError() {
    const first = (Object.keys(INITIAL_VALUES) as FieldName[]).find((name) => errors[name]);
    if (first) document.getElementById(first)?.focus();
  }

  async function handlePreview() {
    setAttempted(true);
    if (!isValid) return focusFirstError();

    setPreviewing(true);
    setSubmitError(null);
    try {
      const draft = await saveCampaignDraft(toInput(values, imageNames), draftId);
      router.push(`/campaigns/preview?draft=${encodeURIComponent(draft.id)}`);
    } catch {
      setSubmitError("We couldn't open the preview. Check your connection and try again.");
      setPreviewing(false);
    }
  }

  async function submit() {
    setAttempted(true);
    if (!isValid) return focusFirstError();

    setSubmitting(true);
    setSubmitError(null);
    try {
      const campaign = await createCampaign(toInput(values, imageNames));
      if (draftId) await deleteCampaignDraft(draftId);
      router.push(`/campaigns/posted?id=${encodeURIComponent(campaign.id)}`);
    } catch {
      setSubmitError("We couldn't post your campaign. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  const completedRequired = REQUIRED_FIELDS.filter((name) => values[name].trim() && !errors[name]).length;

  return (
    <>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6"
      >
        <p className="sr-only" aria-live="polite">
          {completedRequired} of {REQUIRED_FIELDS.length} required fields complete
        </p>

        <Field label="Campaign Title" required {...fieldProps("title")}>
          <input type="text" placeholder="e.g. Summer Glow Launch" className={cn(controlClass(fieldState("title")), "h-11 pr-10")} {...bind("title")} />
        </Field>

        <Field label="Budget / Price (FCFA)" required {...fieldProps("budget")}>
          <input type="text" inputMode="numeric" placeholder="e.g. 500,000" className={cn(controlClass(fieldState("budget")), "h-11 pr-10")} {...bind("budget")} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Start Date" required {...fieldProps("startDate")} valid={false}>
            <input type="date" className={cn(controlClass(fieldState("startDate")), "h-11")} {...bind("startDate")} />
          </Field>
          <Field label="End Date" required {...fieldProps("endDate")} valid={false}>
            <input
              type="date"
              min={values.startDate || undefined}
              className={cn(controlClass(fieldState("endDate")), "h-11")}
              {...bind("endDate")}
            />
          </Field>
        </div>

        <Field label="Expectations / Deliverables" required {...fieldProps("deliverables")} valid={false}>
          <textarea
            rows={3}
            placeholder="e.g. 1 Instagram story, 2 TikTok posts, 1 YouTube mention"
            className={cn(controlClass(fieldState("deliverables")), "resize-y py-2.5")}
            {...bind("deliverables")}
          />
        </Field>

        <fieldset className="flex flex-col gap-5 rounded-xl border border-dashed border-primary-border bg-surface-alt p-4 sm:p-5">
          <legend className="sr-only">Refine your reach (optional)</legend>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-heading">Refine Your Reach</p>
            <OptionalBadge>Optional · can be skipped</OptionalBadge>
          </div>

          <Field label="Or Number of Days" optional {...fieldProps("durationDays")}>
            <input type="text" inputMode="numeric" placeholder="e.g. 14" className={cn(controlClass(fieldState("durationDays")), "h-11 pr-10")} {...bind("durationDays")} />
          </Field>

          <Field label="Minimum Engagement Rate" optional {...fieldProps("minEngagementRate")}>
            <select className={cn(controlClass("idle"), "h-11 cursor-pointer")} {...bind("minEngagementRate")}>
              {engagementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Target Audience — Age Range" optional {...fieldProps("ageRange")}>
              <input type="text" placeholder="e.g. 18–34" className={cn(controlClass(fieldState("ageRange")), "h-11 pr-10")} {...bind("ageRange")} />
            </Field>
            <Field label="Target Audience — Location" optional {...fieldProps("location")}>
              <input type="text" placeholder="e.g. Douala, Yaoundé" className={cn(controlClass(fieldState("location")), "h-11 pr-10")} {...bind("location")} />
            </Field>
          </div>

          <Field label="Target Audience — Interests" optional {...fieldProps("interests")}>
            <input type="text" placeholder="e.g. Beauty, skincare, fashion" className={cn(controlClass(fieldState("interests")), "h-11 pr-10")} {...bind("interests")} />
          </Field>

          <Field id="images" label="Campaign Reference Images" optional>
            <input
              id="images"
              name="images"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setImages(Array.from(event.target.files ?? []))}
              className={cn(
                controlClass(images.length ? "valid" : "idle"),
                "py-2.5 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-surface-alt file:px-3 file:py-1 file:text-sm file:font-medium file:text-heading"
              )}
            />
            {!images.length && draftImageNames.length > 0 && (
              <p className="mt-1.5 text-xs text-muted">Still attached: {draftImageNames.join(", ")}</p>
            )}
          </Field>
        </fieldset>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handlePreview()}
              disabled={previewing || submitting}
              className="disabled:cursor-not-allowed disabled:opacity-60"
            >
              {previewing ? "Opening preview…" : "Preview Campaign"}
            </Button>
            <Button type="submit" disabled={submitting || previewing} className="disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Posting…" : "Post Your Campaign Now"}
            </Button>
          </div>
          {attempted && !isValid && (
            <p className="text-sm font-medium text-danger" role="alert">
              Fill in the fields marked in red to continue.
            </p>
          )}
          {submitError && (
            <p className="text-sm font-medium text-danger" role="alert">
              {submitError}
            </p>
          )}
          <p className="text-xs text-muted">
            By posting, your campaign is sent to matching influencers for review — no charge until an influencer accepts
            and funds are placed in escrow.
          </p>
        </div>
      </form>
    </>
  );
}
