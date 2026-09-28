import type { CampaignFormErrors, CampaignFormValues, CampaignRequiredField } from "@/types/direct-campaign";

// Shared by the server action (authoritative validation) and the client form (live feedback).
export const TITLE_MIN = 3;
export const TITLE_MAX = 80;
export const DELIVERABLES_MIN = 10;
export const DELIVERABLES_MAX = 1000;
export const MIN_BUDGET = 50_000;
export const MAX_BUDGET = 100_000_000;
export const MAX_CAMPAIGN_DAYS = 365;
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const REQUIRED_FIELDS: CampaignRequiredField[] = [
  "title",
  "niche",
  "budget",
  "startDate",
  "endDate",
  "deliverables",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// YYYY-MM-DD in local time, optionally shifted by whole days.
export function todayISO(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isValidDate(value: string) {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

// Inclusive number of days between two dates, or null if either is invalid or the range is reversed.
export function campaignDays(startDate: string, endDate: string) {
  if (!isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate) return null;
  const millis = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Math.round(millis / 86_400_000) + 1;
}

export function validateCampaign(values: CampaignFormValues, today: string): CampaignFormErrors {
  const errors: CampaignFormErrors = {};
  const title = values.title.trim();
  const deliverables = values.deliverables.trim();
  const budget = Number(values.budget);

  if (title.length < TITLE_MIN) errors.title = "Give your campaign a title.";
  else if (title.length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`;

  if (!values.niche) errors.niche = "Choose the niche you want to reach.";

  if (!/^\d+$/.test(values.budget) || budget <= 0) errors.budget = "Enter your budget in FCFA.";
  else if (budget < MIN_BUDGET) errors.budget = `The minimum budget is ${MIN_BUDGET.toLocaleString("en-US")} FCFA.`;
  else if (budget > MAX_BUDGET) errors.budget = `The maximum budget is ${MAX_BUDGET.toLocaleString("en-US")} FCFA.`;

  if (!isValidDate(values.startDate)) errors.startDate = "Pick a start date.";
  else if (values.startDate < today) errors.startDate = "The start date can't be in the past.";

  if (!isValidDate(values.endDate)) errors.endDate = "Pick an end date.";
  else if (!errors.startDate && values.endDate < values.startDate) errors.endDate = "The end date must be after the start date.";
  else if (!errors.startDate && (campaignDays(values.startDate, values.endDate) ?? 0) > MAX_CAMPAIGN_DAYS) {
    errors.endDate = `Campaigns can run for up to ${MAX_CAMPAIGN_DAYS} days.`;
  }

  if (deliverables.length < DELIVERABLES_MIN) errors.deliverables = "Describe what you expect from the influencer.";
  else if (deliverables.length > DELIVERABLES_MAX) {
    errors.deliverables = `Keep this under ${DELIVERABLES_MAX} characters.`;
  }

  return errors;
}
