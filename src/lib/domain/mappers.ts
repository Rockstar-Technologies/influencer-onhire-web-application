import { ACCOUNT_TYPE, ADMIN_ROLE, AGE_RANGE, DEPOSIT_TERMS, HIRE_DURATION, LANGUAGE, MIN_ENGAGEMENT_PCT, PAYMENT_METHOD, PERMISSION } from "./vocabulary";
import type { AccountType, AdminRoleCode, AgeRangeCode, DepositTerms, HireDurationCode, LanguageCode, MinEngagementPct, PaymentMethodCode, PermissionCode } from "./vocabulary";
import { ADMIN_ROLE_LABELS, DEPOSIT_TERMS_LABELS, LANGUAGE_LABELS, PAYMENT_METHOD_LABELS } from "./labels";

/**
 * Boundary translations between what screens and forms use and what the API accepts and returns. Each function is total and strict:
 * a value it does not recognise returns null (never a guess), so a caller must decide what an unexpected value means.
 */

/** Old account-type spellings still found in saved links (`?type=influencer`). A creator is always `creator` in the API and in code. */
export function parseAccountType(value: unknown): AccountType | null {
  if (value === "influencer") return "creator";
  return ACCOUNT_TYPE.is(value) ? value : null;
}

/** Mobile-money method from a stored code or from the display label older screens used as the value ("MTN MoMo"). */
export function parsePaymentMethod(value: unknown): PaymentMethodCode | null {
  if (PAYMENT_METHOD.is(value)) return value;
  if (typeof value !== "string") return null;
  const match = (Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethodCode, string][]).find(([, label]) => label === value);
  return match ? match[0] : null;
}

export function parseLanguage(value: unknown): LanguageCode | null {
  if (LANGUAGE.is(value)) return value;
  if (typeof value !== "string") return null;
  const match = (Object.entries(LANGUAGE_LABELS) as [LanguageCode, string][]).find(([, label]) => label === value);
  return match ? match[0] : null;
}

/** Age range from the API code or from the display form ("45+"); the API code for the open-ended range is `45-plus`. */
export function parseAgeRange(value: unknown): AgeRangeCode | null {
  if (value === "45+") return "45-plus";
  return AGE_RANGE.is(value) ? value : null;
}

/** Campaign form engagement choice ("any" | "3" | "5" | "7") to the API's `minEngagementPct` (null = no minimum). Undefined means "not a valid choice". */
export function engagementFormToApi(choice: unknown): MinEngagementPct | null | undefined {
  if (choice === "any" || choice === "" || choice === null) return null;
  const pct = typeof choice === "string" ? Number(choice) : typeof choice === "number" ? choice : NaN;
  return (MIN_ENGAGEMENT_PCT as readonly number[]).includes(pct) ? (pct as MinEngagementPct) : undefined;
}

/** The inverse, for filling a form from an API value. */
export function engagementApiToForm(pct: number | null | undefined): "any" | "3" | "5" | "7" {
  return pct === 3 || pct === 5 || pct === 7 ? (String(pct) as "3" | "5" | "7") : "any";
}

/** Admin team role from its API code or from the label the invite form used. */
export function parseAdminRole(value: unknown): AdminRoleCode | null {
  if (ADMIN_ROLE.is(value)) return value;
  if (typeof value !== "string") return null;
  const match = (Object.entries(ADMIN_ROLE_LABELS) as [AdminRoleCode, string][]).find(([, label]) => label === value);
  return match ? match[0] : null;
}

/** Permissions come only from the API (`GET /auth/me`); anything this app does not know is dropped rather than trusted. */
export function knownPermissions(codes: readonly string[]): PermissionCode[] {
  return codes.filter((code): code is PermissionCode => PERMISSION.is(code));
}

/** Nullable API fields: the API sends null for "none"; screens use undefined for "not set". */
export const fromNullable = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);
export const toNullable = <T>(value: T | null | undefined): T | null => (value === undefined ? null : value);

// ---- creator application wizard: the frontend shows sentences, the API stores codes and numbers ----------------------------------------

/** "1 week" / "2 weeks" / "1 month" (as the wizard shows them) or an API code ("1-week") to the API's booking-duration code. */
export function parseMinimumBooking(value: unknown): HireDurationCode | null {
  if (HIRE_DURATION.is(value)) return value;
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase().replace(/\s+/g, "-");
  return HIRE_DURATION.is(code) ? code : null;
}

/** "2 rounds of content revisions" or 2 to the API's `revisionsRounds` (1 to 3). */
export function parseRevisionRounds(value: unknown): 1 | 2 | 3 | null {
  const rounds = typeof value === "number" ? value : typeof value === "string" ? Number(/^(\d) rounds? of content revisions$/.exec(value.trim())?.[1] ?? value) : NaN;
  return rounds === 1 || rounds === 2 || rounds === 3 ? rounds : null;
}

/** "Content usage rights: 6 months" or 6 to the API's `usageRightsMonths` (3, 6 or 12). */
export function parseUsageRightsMonths(value: unknown): 3 | 6 | 12 | null {
  const months = typeof value === "number" ? value : typeof value === "string" ? Number(/^Content usage rights: (\d+) months$/.exec(value.trim())?.[1] ?? value) : NaN;
  return months === 3 || months === 6 || months === 12 ? months : null;
}

/** The deposit-terms wording the wizard shows, or the API enum value, to the API enum. Informational only: funding stays 100% escrow (decision O-5). */
export function parseDepositTerms(value: unknown): DepositTerms | null {
  if (DEPOSIT_TERMS.is(value)) return value;
  if (typeof value !== "string") return null;
  const match = (Object.entries(DEPOSIT_TERMS_LABELS) as [DepositTerms, string][]).find(([, label]) => label === value);
  return match ? match[0] : null;
}
