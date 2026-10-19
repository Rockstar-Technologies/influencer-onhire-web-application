import type { CampaignOptions, CampaignView } from "@/lib/api/schemas";
import { engagementApiToForm, engagementFormToApi } from "@/lib/domain/mappers";
import type { AgeRangeCode } from "@/lib/domain/vocabulary";

/**
 * Pure translation between the campaign form (strings the person typed) and the Express API's contract. The brand's budget is the MAXIMUM
 * the brand will pay (whole XAF, never divided among creators); dates are calendar dates (YYYY-MM-DD).
 */
export interface CampaignForm {
  title: string;
  niche: string; // niche slug
  budget: string; // digits only, as typed: "500000"
  startDate: string;
  endDate: string;
  deliverables: string;
  minEngagement: "any" | "3" | "5" | "7";
  ageRanges: AgeRangeCode[];
  cities: string[]; // city slugs
  interests: string[]; // interest slugs
}

export const EMPTY_CAMPAIGN_FORM: CampaignForm = {
  title: "",
  niche: "",
  budget: "",
  startDate: "",
  endDate: "",
  deliverables: "",
  minEngagement: "any",
  ageRanges: [],
  cities: [],
  interests: [],
};

export function campaignToForm(campaign: CampaignView): CampaignForm {
  return {
    title: campaign.title,
    niche: campaign.niche.slug,
    budget: String(campaign.budgetXaf),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    deliverables: campaign.deliverables,
    minEngagement: engagementApiToForm(campaign.minEngagement?.pct),
    ageRanges: campaign.ageRanges.map((a) => a.code),
    cities: campaign.cities.map((c) => c.slug),
    interests: campaign.interests.map((i) => i.slug),
  };
}

/**
 * The request body for POST and PATCH. Every editable field is sent (a PATCH replaces a list it names), so saving the form always stores
 * exactly what the form shows. `imageFileIds` is always empty: there is no upload endpoint, so no image can be attached yet.
 */
export function campaignToApi(form: CampaignForm) {
  const minEngagementPct = engagementFormToApi(form.minEngagement);
  return {
    title: form.title.trim(),
    niche: form.niche,
    budgetXaf: Number(form.budget),
    startDate: form.startDate,
    endDate: form.endDate,
    deliverables: form.deliverables.trim(),
    minEngagementPct: minEngagementPct === undefined ? null : minEngagementPct,
    cities: form.cities,
    interests: form.interests,
    ageRanges: form.ageRanges,
    imageFileIds: [] as string[],
  };
}

export type CampaignApiBody = ReturnType<typeof campaignToApi>;

/** API field names to the form's names (the API calls the budget `budgetXaf` and the engagement choice `minEngagementPct`). */
const FORM_FIELD: Record<string, keyof CampaignForm | "form"> = {
  title: "title",
  niche: "niche",
  budgetXaf: "budget",
  startDate: "startDate",
  endDate: "endDate",
  deliverables: "deliverables",
  minEngagementPct: "minEngagement",
  cities: "cities",
  interests: "interests",
  ageRanges: "ageRanges",
  imageFileIds: "form",
};

export function fieldErrorsFromDetails(details: readonly { path: string; message: string }[]): Partial<Record<keyof CampaignForm | "form", string>> {
  const errors: Partial<Record<keyof CampaignForm | "form", string>> = {};
  for (const detail of details) {
    const field = detail.path.replace(/^body\./, "").split(/[.[]/)[0] ?? "";
    const key = FORM_FIELD[field] ?? "form";
    if (!errors[key]) errors[key] = detail.message;
  }
  return errors;
}

// ---- local validation (friendly feedback; the API stays the authority) -------------------------------------------------------------------
export const TITLE_MIN = 3;
export const TITLE_MAX = 80;
export const DELIVERABLES_MIN = 10;
export const DELIVERABLES_MAX = 1000;
export const MAX_CAMPAIGN_DAYS = 365;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (value: string) => DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

/** Inclusive number of days between two calendar dates, or null if either is not a real date or the range is reversed. */
export function campaignDays(startDate: string, endDate: string): number | null {
  if (!isRealDate(startDate) || !isRealDate(endDate) || endDate < startDate) return null;
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1;
}

export type CampaignFormErrors = Partial<Record<keyof CampaignForm | "form", string>>;

export function validateCampaignForm(form: CampaignForm, options: Pick<CampaignOptions, "limits">, today: string): CampaignFormErrors {
  const errors: CampaignFormErrors = {};
  const { budgetMinXaf, budgetMaxXaf } = options.limits;
  const title = form.title.trim().length;
  if (title < TITLE_MIN) errors.title = "Give your campaign a title.";
  else if (title > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`;

  if (!form.niche) errors.niche = "Choose the niche you want to reach.";

  const budget = Number(form.budget);
  if (!/^\d+$/.test(form.budget) || budget <= 0) errors.budget = "Enter your budget in FCFA.";
  else if (budget < budgetMinXaf) errors.budget = `The minimum budget is ${budgetMinXaf.toLocaleString("en-US")} FCFA.`;
  else if (budget > budgetMaxXaf) errors.budget = `The maximum budget is ${budgetMaxXaf.toLocaleString("en-US")} FCFA.`;

  if (!isRealDate(form.startDate)) errors.startDate = "Pick a start date.";
  else if (form.startDate < today) errors.startDate = "The start date can't be in the past.";

  if (!isRealDate(form.endDate)) errors.endDate = "Pick an end date.";
  else if (!errors.startDate && form.endDate < form.startDate) errors.endDate = "The end date must be after the start date.";
  else if (!errors.startDate && (campaignDays(form.startDate, form.endDate) ?? 0) > MAX_CAMPAIGN_DAYS) {
    errors.endDate = `Campaigns can run for up to ${MAX_CAMPAIGN_DAYS} days.`;
  }

  const deliverables = form.deliverables.trim().length;
  if (deliverables < DELIVERABLES_MIN) errors.deliverables = "Describe what you expect from the influencer.";
  else if (deliverables > DELIVERABLES_MAX) errors.deliverables = `Keep this under ${DELIVERABLES_MAX} characters.`;

  if (form.cities.length > 10) errors.cities = "Choose at most 10 locations.";
  if (form.interests.length > 10) errors.interests = "Choose at most 10 interests.";
  return errors;
}

export const REQUIRED_FIELDS = ["title", "niche", "budget", "startDate", "endDate", "deliverables"] as const;

/** YYYY-MM-DD in local time, optionally shifted by whole days. */
export function todayISO(offsetDays = 0, now: Date = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
