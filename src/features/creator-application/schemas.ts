import { z } from "zod";
import { DEPOSIT_TERMS, HIRE_DURATION, LANGUAGE, PAYMENT_METHOD, PLATFORM } from "@/lib/domain/vocabulary";

/**
 * Server-side shape checks for what the browser sends to the wizard Server Actions (they are reachable by a direct POST). They are STRICT:
 * no creator id, application id or any other field is accepted, because the API derives the creator from the session. Value limits that the
 * API owns (minimum followers, minimum price, length of the bio) are deliberately left to the API so that the two can never disagree.
 */
const text = (max: number) => z.string().max(max);

export const profileInputSchema = z.strictObject({
  displayName: text(200),
  primaryNiche: text(60),
  otherNiches: z.array(text(60)).max(10),
  city: text(60),
  bio: text(5000),
  photoFileId: z.uuid().nullable(),
  language: z.enum(LANGUAGE.values).nullable(),
  contentStyle: text(1000).nullable(),
  engagementRatePct: z.number().finite().nullable(),
});

export const audienceInputSchema = z.strictObject({
  platforms: z.array(z.strictObject({ platform: z.enum(PLATFORM.values), handle: text(200), followers: z.number().int().finite() })).max(4),
  collaborations: z.array(z.strictObject({ brandName: text(200), description: text(600).nullable(), year: z.number().int().finite() })).max(10),
  brandFit: z.array(z.number().int().positive()).max(30),
});

export const ratesInputSchema = z.strictObject({
  prices: z.array(z.strictObject({ platform: z.enum(PLATFORM.values), priceXaf: z.number().int().finite() })).max(4),
  minimumBooking: z.enum(HIRE_DURATION.values),
  deliverables: text(3000),
  revisionsRounds: z.number().int(),
  usageRightsMonths: z.number().int(),
  depositTerms: z.enum(DEPOSIT_TERMS.values),
  payoutAccounts: z.array(z.strictObject({ method: z.enum(PAYMENT_METHOD.values), number: text(40) })).max(2),
});

export const submitInputSchema = z.strictObject({ rates: ratesInputSchema.nullable(), confirmAccuracy: z.literal(true) });
