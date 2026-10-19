import { z } from "zod";
import { AGE_RANGE, APPLICATION_STATUS, CAMPAIGN_STATUS, DEPOSIT_TERMS, HIRE_DURATION, LANGUAGE, PAYMENT_METHOD, PLATFORM } from "@/lib/domain/vocabulary";

/** Shapes of the Express API's responses (see backend docs/AUTHENTICATION.md). Unknown extra fields are ignored, not trusted. */
export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
  role: z.enum(["brand", "creator", "admin"]),
  status: z.enum(["pending", "active", "suspended", "rejected"]),
  restricted: z.boolean(),
  createdAt: z.string(),
});
export type ApiUser = z.infer<typeof userSchema>;

export const authUserDataSchema = z.object({ user: userSchema });

export const meDataSchema = z.object({
  user: userSchema,
  permissions: z.array(z.string()).optional(),
  session: z.object({ expiresAt: z.string() }).optional(),
});
export type MeData = z.infer<typeof meDataSchema>;

export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z
      .array(z.object({ path: z.string(), message: z.string(), code: z.string().optional() }))
      .optional(),
  }),
});

export const emptyDataSchema = z.unknown();

// ---- creator application wizard (verified against the running API, backend docs/CREATOR_APPLICATION_WIZARD.md) ----------------------
const nullableString = z.string().nullable();

export const applicationOptionsSchema = z.object({
  niches: z.array(z.object({ slug: z.string(), name: z.string() })),
  cities: z.array(z.object({ slug: z.string(), name: z.string() })),
  platforms: z.array(z.object({ code: z.enum(PLATFORM.values), name: z.string() })),
  brandFit: z.array(z.object({ id: z.number().int().positive(), name: z.string() })),
  minimumBookingOptions: z.array(z.object({ code: z.enum(HIRE_DURATION.values), label: z.string(), days: z.number() })),
  revisionsRounds: z.array(z.number().int()),
  usageRightsMonths: z.array(z.number().int()),
  depositTerms: z.array(z.object({ value: z.enum(DEPOSIT_TERMS.values), label: z.string() })),
  paymentMethods: z.array(z.object({ code: z.enum(PAYMENT_METHOD.values), name: z.string() })),
  languages: z.array(z.enum(LANGUAGE.values)),
  limits: z.object({
    minTotalFollowers: z.number().int(),
    minPricePerPlatformXaf: z.number().int(),
    maxCollaborations: z.number().int(),
    maxPlatforms: z.number().int(),
    maxOtherNiches: z.number().int(),
    bioMinLength: z.number().int(),
    bioMaxLength: z.number().int(),
    maxBrandFitTags: z.number().int(),
  }),
});
export type ApplicationOptions = z.infer<typeof applicationOptionsSchema>;

const stepProgress = z.object({ complete: z.boolean(), missing: z.array(z.string()) });

export const applicationStateSchema = z.object({
  application: z.object({
    id: z.uuid(),
    status: z.enum(APPLICATION_STATUS.values),
    editable: z.boolean(),
    createdAt: z.string(),
    submittedAt: nullableString,
    reviewedAt: nullableString,
    feedback: z.object({ message: z.string(), decidedAt: z.string() }).nullable(),
  }),
  profile: z.object({
    displayName: nullableString,
    primaryNiche: nullableString,
    otherNiches: z.array(z.string()),
    city: nullableString,
    bio: nullableString,
    /** A reference only: there is no endpoint that serves or uploads photos yet. */
    photoFileId: nullableString,
    language: z.enum(LANGUAGE.values).nullable(),
    contentStyle: nullableString,
    engagementRatePct: z.number().nullable(),
  }),
  audience: z.object({
    platforms: z.array(z.object({ platform: z.enum(PLATFORM.values), handle: z.string(), followers: z.number().int() })),
    collaborations: z.array(z.object({ brandName: z.string(), description: nullableString, year: z.number().int() })),
    brandFit: z.array(z.number().int()),
  }),
  rates: z.object({
    prices: z.array(z.object({ platform: z.enum(PLATFORM.values), priceXaf: z.number().int() })),
    minimumBooking: z.enum(HIRE_DURATION.values).nullable(),
    deliverables: nullableString,
    revisionsRounds: z.number().int().nullable(),
    usageRightsMonths: z.number().int().nullable(),
    depositTerms: z.enum(DEPOSIT_TERMS.values).nullable(),
    /** Payout numbers are never returned by the API: only the network and the last three digits. */
    payoutAccounts: z.array(z.object({ method: z.enum(PAYMENT_METHOD.values), last3: z.string() })),
  }),
  progress: z.object({ profile: stepProgress, audience: stepProgress, rates: stepProgress }),
  canSubmit: z.boolean(),
  nextStep: z.enum(["profile", "audience", "rates", "submit"]).nullable(),
  canReapply: z.boolean(),
});
export type ApplicationState = z.infer<typeof applicationStateSchema>;

export const submitResultSchema = z.object({
  application: z.object({ id: z.uuid(), status: z.enum(APPLICATION_STATUS.values), submittedAt: z.string() }),
});

export const reapplyResultSchema = z.object({
  application: z.object({ id: z.uuid(), status: z.enum(APPLICATION_STATUS.values), createdAt: z.string() }).loose(),
});

// ---- brand campaigns (verified against the running API, backend docs/CAMPAIGN_MANAGEMENT.md) ------------------------------------------
export const campaignOptionsSchema = z.object({
  niches: z.array(z.object({ slug: z.string(), name: z.string() })),
  cities: z.array(z.object({ slug: z.string(), name: z.string() })),
  interests: z.array(z.object({ slug: z.string(), name: z.string() })),
  ageRanges: z.array(z.object({ code: z.enum(AGE_RANGE.values), label: z.string() })),
  engagementLevels: z.array(z.object({ minPct: z.number(), label: z.string() })),
  limits: z.object({ budgetMinXaf: z.number().int(), budgetMaxXaf: z.number().int() }),
});
export type CampaignOptions = z.infer<typeof campaignOptionsSchema>;

const campaignNiche = z.object({ slug: z.string(), name: z.string() });

/** A row of GET /brand/campaigns. Dates: `startDate`/`endDate` are calendar dates, the rest UTC timestamps. */
export const campaignListItemSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  title: z.string(),
  niche: campaignNiche,
  budgetXaf: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(CAMPAIGN_STATUS.values),
  submittedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CampaignListItem = z.infer<typeof campaignListItemSchema>;
export const campaignListSchema = z.array(campaignListItemSchema);

export const campaignViewSchema = campaignListItemSchema.extend({
  deliverables: z.string(),
  minEngagement: z.object({ pct: z.number(), label: z.string() }).nullable(),
  cities: z.array(z.object({ slug: z.string(), name: z.string() })),
  interests: z.array(z.object({ slug: z.string(), name: z.string() })),
  ageRanges: z.array(z.object({ code: z.enum(AGE_RANGE.values), label: z.string() })),
  imageFileIds: z.array(z.string()),
  /** The reviewer's explanation, shown to the brand on its own campaign. */
  reviewNote: z.string().nullable(),
  cancelledAt: z.string().nullable(),
});
export type CampaignView = z.infer<typeof campaignViewSchema>;

export const campaignEnvelopeSchema = z.object({ campaign: campaignViewSchema });
export const campaignDeleteSchema = z.object({ id: z.uuid(), deleted: z.literal(true) });
