import type { HireCreator, OfferView } from "@/lib/api/schemas";
import { parseApiDate } from "@/lib/domain/dates";
import { durationsAtLeast } from "./durations";

/** What a direct-hire request form holds (strings as typed, plus the codes of the choices). */
export interface HireFormValues {
  fullName: string;
  location: string;
  socialHandle: string;
  promotion: string;
  platform: string;
  paymentMethod: string;
  duration: string;
}
export type HireField = keyof HireFormValues;
export type HireFormErrors = Partial<Record<HireField | "form", string>>;

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const PROMOTION_MAX = 500;
export const HANDLE_PATTERN = /^@?[A-Za-z0-9._]{2,30}$/;
export const HIRE_VALID_DAYS = 7;
const HOUR_MS = 3_600_000;

export function initialHireValues(creator: HireCreator, preferredDuration = "1-month"): HireFormValues {
  const durations = durationsAtLeast(creator.minimumBooking.days);
  return {
    fullName: "",
    location: "",
    socialHandle: "",
    promotion: "",
    platform: creator.platforms[0]?.platform ?? "",
    paymentMethod: creator.acceptedPaymentMethods[0]?.code ?? "",
    duration: durations.some((d) => d.value === preferredDuration) ? preferredDuration : (durations[0]?.value ?? ""),
  };
}

/**
 * The request body of POST /brand/offers. There is NO price, status, brand, creator id or date: the price is the creator's current rate for
 * the chosen platform, read and frozen by the API; the brand comes from the session. Optional fields are left out when empty.
 */
export function hireToApi(username: string, values: HireFormValues) {
  const handle = values.socialHandle.trim();
  const promotion = values.promotion.trim();
  return {
    creator: username,
    platform: values.platform,
    duration: values.duration,
    paymentMethod: values.paymentMethod,
    contactName: values.fullName.trim(),
    location: values.location.trim(),
    ...(handle ? { socialHandle: handle.startsWith("@") ? handle : `@${handle}` } : {}),
    ...(promotion ? { promotion } : {}),
  };
}

/** Friendly checks before anything is sent. The API stays the authority (it re-checks the creator's platforms, methods and minimum booking). */
export function validateHireForm(values: HireFormValues, creator: HireCreator): HireFormErrors {
  const errors: HireFormErrors = {};
  const name = values.fullName.trim();
  const location = values.location.trim();
  if (name.length < NAME_MIN) errors.fullName = "Enter your full name.";
  else if (name.length > NAME_MAX) errors.fullName = `Keep your name under ${NAME_MAX} characters.`;
  if (location.length < NAME_MIN) errors.location = "Enter your city and country.";
  else if (location.length > NAME_MAX) errors.location = `Keep your location under ${NAME_MAX} characters.`;
  if (values.socialHandle.trim() && !HANDLE_PATTERN.test(values.socialHandle.trim())) {
    errors.socialHandle = "Use a handle like @yourbrand (letters, numbers, dots and underscores).";
  }
  if (values.promotion.trim().length > PROMOTION_MAX) errors.promotion = `Keep this under ${PROMOTION_MAX} characters.`;
  if (!creator.platforms.some((p) => p.platform === values.platform)) errors.platform = "Choose one of the platforms listed.";
  if (!creator.acceptedPaymentMethods.some((m) => m.code === values.paymentMethod)) errors.paymentMethod = "Choose one of the payment methods listed.";
  if (!durationsAtLeast(creator.minimumBooking.days).some((d) => d.value === values.duration)) {
    errors.duration = `Choose a duration of at least ${creator.minimumBooking.label}.`;
  }
  return errors;
}

const HIRE_FIELD: Record<string, HireField> = {
  contactName: "fullName",
  location: "location",
  socialHandle: "socialHandle",
  promotion: "promotion",
  platform: "platform",
  paymentMethod: "paymentMethod",
  duration: "duration",
};

/** Maps the API's `details[].path` (`body.contactName`) to the form's field names. Anything else lands on the form as a whole. */
export function hireErrorsFromDetails(details: readonly { path: string; message: string }[]): HireFormErrors {
  const errors: HireFormErrors = {};
  for (const detail of details) {
    const field = detail.path.replace(/^body\./, "").split(/[.[]/)[0] ?? "";
    const key = HIRE_FIELD[field] ?? "form";
    if (!errors[key]) errors[key] = detail.message;
  }
  return errors;
}

// ---- reading an offer ------------------------------------------------------------------------------------------------------------

/** What an offer IS, from the API's `origin` and `initiator` (never guessed from text). */
export type OfferKind = "direct_hire" | "invitation" | "application";

export function offerKind(offer: Pick<OfferView, "origin" | "initiator">): OfferKind {
  if (offer.origin === "direct_hire") return "direct_hire";
  return offer.initiator === "creator" ? "application" : "invitation";
}

/** A pending direct hire expires 168 hours after it was created (backend docs/PLATFORM_INVITATIONS.md, decision 5); invitations and applications do not expire by time. */
export function hireAnswerBy(offer: Pick<OfferView, "origin" | "status" | "createdAt">): Date | null {
  if (offer.origin !== "direct_hire" || offer.status !== "pending") return null;
  const created = parseApiDate(offer.createdAt);
  return created ? new Date(created.getTime() + HIRE_VALID_DAYS * 24 * HOUR_MS) : null;
}

export const START_DATE_MAX_DAYS = 365;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written YYYY-MM-DD. */
export function isCalendarDate(value: string): boolean {
  return DATE_ONLY.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

/** A friendly check of the start date a creator picks when accepting a hire. The API decides (Africa/Douala "today", past, 365-day limit). */
export function startDateProblem(value: string, today: string): string | null {
  if (!value) return null; // optional: the API uses today
  if (!isCalendarDate(value)) return "Choose a real date.";
  if (value < today) return "The start date can't be in the past.";
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + START_DATE_MAX_DAYS);
  if (value > limit.toISOString().slice(0, 10)) return "The start date can be at most a year ahead.";
  return null;
}
