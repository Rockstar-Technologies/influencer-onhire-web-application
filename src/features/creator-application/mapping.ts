import type { ApplicationOptions, ApplicationState } from "@/lib/api/schemas";
import { parseAmount } from "@/lib/format";
import type { DepositTerms, HireDurationCode, LanguageCode, PaymentMethodCode, PlatformCode } from "@/lib/domain/vocabulary";
import { PAYMENT_METHOD } from "@/lib/domain/vocabulary";

/**
 * Pure translation between the wizard's form values (strings the person typed, display names) and the Express API's contract
 * (slugs, ids, numbers, codes). Nothing here talks to the network. See the backend's docs/CREATOR_APPLICATION_WIZARD.md.
 */

export const DEFAULT_DELIVERABLES = "1 Instagram reel + 3 stories per booking";

// ---- step 1: profile ---------------------------------------------------------------------------------------------------------------------
/** What the person edits. `displayName` is the frontend's old `fullName` ("Creator name"). */
export interface ProfileForm {
  displayName: string;
  primaryNiche: string; // niche slug
  city: string; // city slug
  bio: string;
}

/**
 * Optional API fields the wizard does not (yet) collect. Saving a step REPLACES it on the server ("omitted optional fields are cleared"), so
 * whatever the server already holds is sent back unchanged; otherwise editing the name would silently erase it.
 */
export interface PreservedProfile {
  otherNiches: string[];
  photoFileId: string | null;
  language: LanguageCode | null;
  contentStyle: string | null;
  engagementRatePct: number | null;
}

export function profileFromState(state: ApplicationState): { form: ProfileForm; preserved: PreservedProfile } {
  const p = state.profile;
  return {
    form: { displayName: p.displayName ?? "", primaryNiche: p.primaryNiche ?? "", city: p.city ?? "", bio: p.bio ?? "" },
    preserved: { otherNiches: p.otherNiches, photoFileId: p.photoFileId, language: p.language, contentStyle: p.contentStyle, engagementRatePct: p.engagementRatePct },
  };
}

export function profileToApi(form: ProfileForm, preserved: PreservedProfile) {
  return {
    displayName: form.displayName.trim(),
    primaryNiche: form.primaryNiche,
    otherNiches: preserved.otherNiches.filter((slug) => slug !== form.primaryNiche),
    city: form.city,
    bio: form.bio.trim(),
    photoFileId: preserved.photoFileId,
    language: preserved.language,
    contentStyle: preserved.contentStyle,
    engagementRatePct: preserved.engagementRatePct,
  };
}

// ---- step 2: audience ------------------------------------------------------------------------------------------------------------------
export interface PlatformRow {
  on: boolean;
  handle: string;
  followers: string; // as typed, e.g. "25,000"
}

export interface CollaborationRow {
  brand: string;
  description: string;
  year: string;
}

export interface AudienceForm {
  platforms: Record<PlatformCode, PlatformRow>;
  collaborations: CollaborationRow[];
  brandFit: number[]; // brand-fit tag ids
}

export function emptyPlatformRows(options: ApplicationOptions): Record<PlatformCode, PlatformRow> {
  return Object.fromEntries(options.platforms.map((p) => [p.code, { on: false, handle: "", followers: "" }])) as Record<PlatformCode, PlatformRow>;
}

export function audienceFromState(state: ApplicationState, options: ApplicationOptions): AudienceForm {
  const platforms = emptyPlatformRows(options);
  for (const saved of state.audience.platforms) platforms[saved.platform] = { on: true, handle: saved.handle, followers: saved.followers.toLocaleString("en-US") };
  return {
    platforms,
    collaborations: state.audience.collaborations.map((c) => ({ brand: c.brandName, description: c.description ?? "", year: String(c.year) })),
    brandFit: state.audience.brandFit,
  };
}

export function audienceToApi(form: AudienceForm, options: ApplicationOptions) {
  return {
    platforms: options.platforms
      .filter((p) => form.platforms[p.code]?.on)
      .map((p) => ({ platform: p.code, handle: form.platforms[p.code].handle.trim(), followers: Math.trunc(parseAmount(form.platforms[p.code].followers)) })),
    collaborations: form.collaborations.map((c) => ({
      brandName: c.brand.trim(),
      description: c.description.trim() === "" ? null : c.description.trim(),
      year: Number(c.year.trim()),
    })),
    brandFit: form.brandFit,
  };
}

export function totalFollowers(form: AudienceForm, options: ApplicationOptions): number {
  return options.platforms.filter((p) => form.platforms[p.code]?.on).reduce((sum, p) => sum + (Math.trunc(parseAmount(form.platforms[p.code].followers)) || 0), 0);
}

// ---- step 3: rates and payment ---------------------------------------------------------------------------------------------------------
export interface PayoutRow {
  on: boolean;
  number: string;
  /** Last three digits of an already-saved number (the API never returns the number itself). */
  savedLast3: string | null;
}

export interface RatesForm {
  prices: Partial<Record<PlatformCode, string>>;
  minimumBooking: HireDurationCode;
  deliverables: string;
  revisionsRounds: number;
  usageRightsMonths: number;
  depositTerms: DepositTerms;
  payout: Record<PaymentMethodCode, PayoutRow>;
}

/** Wording the wizard has always used for the API's numeric choices. */
export const revisionsLabel = (rounds: number) => `${rounds} ${rounds === 1 ? "round" : "rounds"} of content revisions`;
export const usageRightsLabel = (months: number) => `Content usage rights: ${months} months`;

function pick<T>(choices: readonly T[], preferred: T): T {
  return choices.includes(preferred) ? preferred : (choices[0] as T);
}

export function ratesFromState(state: ApplicationState, options: ApplicationOptions): RatesForm {
  const r = state.rates;
  const bookingCodes = options.minimumBookingOptions.map((o) => o.code);
  const payout = Object.fromEntries(PAYMENT_METHOD.values.map((m) => [m, { on: false, number: "", savedLast3: null }])) as Record<PaymentMethodCode, PayoutRow>;
  if (r.payoutAccounts.length === 0) payout.mtn_momo.on = true;
  for (const account of r.payoutAccounts) payout[account.method] = { on: true, number: "", savedLast3: account.last3 };
  return {
    prices: Object.fromEntries(r.prices.map((p) => [p.platform, p.priceXaf.toLocaleString("en-US")])),
    minimumBooking: r.minimumBooking ?? pick(bookingCodes, "2-weeks"),
    deliverables: r.deliverables ?? DEFAULT_DELIVERABLES,
    revisionsRounds: r.revisionsRounds ?? pick(options.revisionsRounds, 2),
    usageRightsMonths: r.usageRightsMonths ?? pick(options.usageRightsMonths, 6),
    // Nothing saved yet: default to the approved funding policy (100% escrow). The 50% wording stays selectable but informational (decision O-5).
    depositTerms: r.depositTerms ?? "full_in_escrow",
    payout,
  };
}

export function ratesToApi(form: RatesForm, savedPlatforms: readonly PlatformCode[]) {
  return {
    prices: savedPlatforms.map((platform) => ({ platform, priceXaf: Math.trunc(parseAmount(form.prices[platform] ?? "")) })),
    minimumBooking: form.minimumBooking,
    deliverables: form.deliverables.trim(),
    revisionsRounds: form.revisionsRounds,
    usageRightsMonths: form.usageRightsMonths,
    depositTerms: form.depositTerms,
    payoutAccounts: PAYMENT_METHOD.values.filter((m) => form.payout[m].on).map((method) => ({ method, number: form.payout[method].number.trim() })),
  };
}

// ---- errors ------------------------------------------------------------------------------------------------------------------------------
export type WizardStep = "profile" | "audience" | "rates";

/**
 * API error paths look like `body.bio` (a rejected save) or `profile.bio` / `rates.prices.instagram` (an incomplete submit). Both are turned
 * into a step and a field key the forms understand: the first path segment after `body.`, or after the step name.
 */
export function splitErrorPath(path: string): { step: WizardStep | null; field: string } {
  const withoutBody = path.replace(/^body\./, "");
  const match = /^(profile|audience|rates)\.(.+)$/.exec(withoutBody);
  if (match) return { step: match[1] as WizardStep, field: match[2] as string };
  return { step: null, field: withoutBody };
}

export function fieldErrorsFromDetails(details: readonly { path: string; message: string }[], onlyStep?: WizardStep): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const detail of details) {
    const { step, field } = splitErrorPath(detail.path);
    if (onlyStep && step && step !== onlyStep) continue;
    if (!fields[field]) fields[field] = detail.message;
  }
  return fields;
}

export function stepsWithErrors(details: readonly { path: string }[]): WizardStep[] {
  const steps = new Set<WizardStep>();
  for (const detail of details) {
    const { step } = splitErrorPath(detail.path);
    if (step) steps.add(step);
  }
  return (["profile", "audience", "rates"] as const).filter((s) => steps.has(s));
}
