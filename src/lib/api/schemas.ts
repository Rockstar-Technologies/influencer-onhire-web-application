import { z } from "zod";
import { AGE_RANGE, APPLICATION_STATUS, CAMPAIGN_STATUS, DEPOSIT_TERMS, HIRE_DURATION, LANGUAGE, OFFER_INITIATOR, OFFER_ORIGIN, OFFER_STATUS, PAYMENT_METHOD, PLATFORM } from "@/lib/domain/vocabulary";

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

// ---- offers, invitations and direct hires (verified against the running API, backend docs/DIRECT_HIRING.md) ------------------------------
const offerPlatform = z.object({ code: z.string(), name: z.string() });

/**
 * One offer as the API returns it. `origin` + `initiator` say what it is: a direct hire (`direct_hire`, brand), a platform invitation to a
 * campaign (`campaign_match`, platform) or a creator's own application (`campaign_match`, creator). Creators also get `brandName`; brands get `creator`.
 */
export const offerViewSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  origin: z.enum(OFFER_ORIGIN.values),
  status: z.enum(OFFER_STATUS.values),
  initiator: z.enum(OFFER_INITIATOR.values),
  priceXaf: z.number().int(),
  platform: offerPlatform.nullable(),
  pitch: z.string().nullable(),
  window: z.object({ startDate: z.string(), endDate: z.string() }).nullable(),
  fundingDeadline: z.string().nullable(),
  respondedAt: z.string().nullable(),
  createdAt: z.string(),
  campaign: z
    .object({
      id: z.uuid(),
      reference: z.string(),
      title: z.string(),
      status: z.string(),
      maxBudgetXaf: z.number().int(),
      startDate: z.string(),
      endDate: z.string(),
      brandName: z.string().optional(),
    })
    .nullable(),
  hire: z
    .object({
      contactName: z.string().nullable(),
      location: z.string().nullable(),
      socialHandle: z.string().nullable(),
      promotion: z.string().nullable(),
      durationDays: z.number().int().nullable(),
      durationLabel: z.string().nullable(),
      paymentMethod: z.object({ code: z.string(), name: z.string() }),
    })
    .nullable(),
  /** Creator view only. */
  brandName: z.string().optional(),
  /** Brand view only: public facts about the creator (no e-mail, phone or ids). */
  creator: z
    .object({
      username: z.string(),
      displayName: z.string(),
      photoFileId: z.string().nullable(),
      city: z.string().nullable(),
      platformHandle: z.string().nullable(),
      platformFollowers: z.number().int().nullable(),
      listedRateXaf: z.number().int().nullable(),
    })
    .optional(),
});
export type OfferView = z.infer<typeof offerViewSchema>;
export const offerListSchema = z.array(offerViewSchema);
export const offerEnvelopeSchema = z.object({ offer: offerViewSchema });
export const declineReasonsSchema = z.array(z.object({ id: z.number().int().positive(), label: z.string() }));
export type DeclineReason = z.infer<typeof declineReasonsSchema>[number];

/** The parts of GET /creators/:username that the hire form needs (brand sessions only). */
export const hireCreatorSchema = z.object({
  creator: z.object({
    username: z.string(),
    displayName: z.string(),
    photoFileId: z.string().nullable(),
    city: z.object({ slug: z.string(), name: z.string() }),
    primaryNiche: z.string(),
    minimumBooking: z.object({ code: z.string(), label: z.string(), days: z.number().int() }),
    platforms: z.array(z.object({ platform: z.enum(PLATFORM.values), name: z.string(), handle: z.string(), followers: z.number().int(), priceXaf: z.number().int() })),
    acceptedPaymentMethods: z.array(z.object({ code: z.enum(PAYMENT_METHOD.values), name: z.string() })),
  }),
});
export type HireCreator = z.infer<typeof hireCreatorSchema>["creator"];

// ---- notifications (verified against the running API, backend docs/NOTIFICATIONS.md) ----------------------------------------------------
/** `type` is kept as text: a kind added later must not break the page (the app shows it neutrally). Titles and bodies are the API's fixed snapshots. */
export const notificationViewSchema = z.object({
  id: z.uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
  links: z.object({
    campaignId: z.uuid().nullable(),
    offerId: z.uuid().nullable(),
    paymentId: z.uuid().nullable(),
    withdrawalId: z.uuid().nullable(),
  }),
});
export type NotificationView = z.infer<typeof notificationViewSchema>;
export const notificationListSchema = z.array(notificationViewSchema);
export const unreadCountSchema = z.object({ unread: z.number().int().nonnegative() });
export const markReadResultSchema = z.object({ notification: notificationViewSchema });
export const markAllReadResultSchema = z.object({ updated: z.number().int().nonnegative(), unread: z.number().int().nonnegative() });

// ---- escrow funding and brand payments (verified against the running API, backend docs/PAYMENTS_FUNDING.md) ---------------------------------
/** `expired` is reported when an accepted offer lapsed unfunded. A status this app does not know is a contract error, never shown as paid. */
export const FUNDING_STATUS = ["not_started", "awaiting_confirmation", "indeterminate", "failed", "under_review", "funded", "expired"] as const;
export type FundingStatus = (typeof FUNDING_STATUS)[number];

export const fundingViewSchema = z.object({
  offerId: z.uuid(),
  /** The amount the brand pays: exactly the offer's price, set by the API. 100% goes into escrow. */
  amountXaf: z.number().int(),
  deadline: z.string().nullable(),
  status: z.enum(FUNDING_STATUS),
  canStart: z.boolean(),
  /** True when the money came from the fake provider (development only): no real money moved. */
  simulated: z.boolean(),
  payment: z.object({ id: z.uuid(), reference: z.string(), status: z.string() }).nullable(),
  attempts: z.array(
    z.object({
      id: z.uuid(),
      status: z.string(),
      confirmation: z.enum(["awaiting_confirmation", "indeterminate", "failed", "succeeded"]),
      failure: z.object({ category: z.string() }).nullable(),
      startedAt: z.string(),
      completedAt: z.string().nullable(),
      simulated: z.boolean(),
    }),
  ),
});
export type FundingView = z.infer<typeof fundingViewSchema>;
export const fundingEnvelopeSchema = z.object({ funding: fundingViewSchema });
export const fundResultSchema = z.object({ funding: fundingViewSchema, replayed: z.boolean() });

/** One of the brand's payments. A brand never sees the platform fee or the creator's net. */
export const brandPaymentSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  status: z.string(),
  amountXaf: z.number().int(),
  fundedAt: z.string(),
  simulated: z.boolean(),
  requestedAt: z.string().nullable(),
  releasedAt: z.string().nullable(),
  engagement: z.object({
    offerId: z.uuid(),
    origin: z.string(),
    campaign: z.object({ id: z.uuid(), reference: z.string(), title: z.string() }).nullable(),
  }),
  creator: z.object({ username: z.string(), displayName: z.string() }),
});
export type BrandPayment = z.infer<typeof brandPaymentSchema>;
export const paymentListSchema = z.array(brandPaymentSchema);

// ---- administration (verified against the running API: backend docs/ADMIN_ACCOUNT_MANAGEMENT.md, CAMPAIGN_MANAGEMENT.md, PAYMENTS_DELIVERY_RELEASE.md) ----------
const isoText = z.string();

export const adminUserListItemSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
  role: z.enum(["brand", "creator", "admin"]),
  status: z.enum(["pending", "active", "suspended", "rejected"]),
  isFlagged: z.boolean(),
  lastActiveAt: isoText.nullable(),
  createdAt: isoText,
  username: z.string().nullable().optional(),
  applicationStatus: z.string().nullable().optional(),
});
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;
export const adminUserListSchema = z.array(adminUserListItemSchema);

export const adminUserDetailSchema = adminUserListItemSchema.extend({
  updatedAt: isoText,
  brandProfile: z.object({ industry: z.string().nullable(), city: z.string().nullable() }).optional(),
  creatorProfile: z.object({ username: z.string(), displayName: z.string(), city: z.string().nullable(), joinedAt: isoText }).optional(),
  applications: z.array(z.object({ id: z.uuid(), status: z.string(), createdAt: isoText, submittedAt: isoText.nullable(), reviewedAt: isoText.nullable() })).optional(),
  adminRole: z.unknown().optional(),
});
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;
export const adminUserEnvelopeSchema = z.object({ user: adminUserDetailSchema });

export const adminApplicationListItemSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  displayName: z.string().nullable(),
  createdAt: isoText,
  submittedAt: isoText.nullable(),
  reviewedAt: isoText.nullable(),
  applicant: z.object({ id: z.uuid(), email: z.string(), fullName: z.string() }),
});
export type AdminApplicationListItem = z.infer<typeof adminApplicationListItemSchema>;
export const adminApplicationListSchema = z.array(adminApplicationListItemSchema);

export const adminApplicationDetailSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  createdAt: isoText,
  submittedAt: isoText.nullable(),
  reviewedAt: isoText.nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  applicant: z.object({ id: z.uuid(), email: z.string(), fullName: z.string(), phone: z.string().nullable(), accountStatus: z.string() }),
  profile: z.object({
    displayName: z.string().nullable(),
    photoFileId: z.string().nullable(),
    city: z.object({ slug: z.string(), name: z.string() }).nullable(),
    bio: z.string().nullable(),
    contentStyle: z.string().nullable(),
    language: z.string().nullable(),
    engagementRatePct: z.number().nullable(),
    minimumBooking: z.object({ code: z.string(), label: z.string(), days: z.number().int() }).nullable(),
    deliverables: z.string().nullable(),
    revisionsRounds: z.number().int().nullable(),
    usageRightsMonths: z.number().int().nullable(),
    depositTerms: z.string().nullable(),
  }),
  niches: z.array(z.object({ slug: z.string(), name: z.string(), isPrimary: z.boolean() })),
  platforms: z.array(z.object({ code: z.string(), name: z.string(), handle: z.string(), followers: z.number().int(), priceXaf: z.number().int() })),
  collaborations: z.array(z.object({ position: z.number().int(), brandName: z.string(), description: z.string().nullable(), year: z.number().int() })),
  brandFit: z.array(z.string()),
  /** Payout details are only ever the network and the last three digits. */
  payoutMethods: z.array(z.object({ method: z.string(), methodName: z.string(), last3: z.string() })),
});
export type AdminApplicationDetail = z.infer<typeof adminApplicationDetailSchema>;
export const adminApplicationEnvelopeSchema = z.object({ application: adminApplicationDetailSchema });

export const adminCampaignListItemSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  title: z.string(),
  niche: z.object({ slug: z.string(), name: z.string() }),
  budgetXaf: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  submittedAt: isoText.nullable(),
  reviewedAt: isoText.nullable(),
  createdAt: isoText,
  updatedAt: isoText,
  brand: z.object({ id: z.uuid(), name: z.string() }),
});
export type AdminCampaignListItem = z.infer<typeof adminCampaignListItemSchema>;
export const adminCampaignListSchema = z.array(adminCampaignListItemSchema);

export const adminCampaignDetailSchema = adminCampaignListItemSchema.extend({
  deliverables: z.string(),
  minEngagement: z.object({ pct: z.number(), label: z.string() }).nullable(),
  cities: z.array(z.object({ slug: z.string(), name: z.string() })),
  interests: z.array(z.object({ slug: z.string(), name: z.string() })),
  ageRanges: z.array(z.object({ code: z.string(), label: z.string() })),
  imageFileIds: z.array(z.string()),
  reviewNote: z.string().nullable(),
  cancelledAt: isoText.nullable(),
  reviewedBy: z.string().nullable().optional(),
});
export type AdminCampaignDetail = z.infer<typeof adminCampaignDetailSchema>;
export const adminCampaignEnvelopeSchema = z.object({ campaign: adminCampaignDetailSchema });

/** A payment as staff see it: with the platform fee and the creator's net (frozen when the payment was confirmed). */
export const adminPaymentSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  status: z.string(),
  amountXaf: z.number().int(),
  fundedAt: isoText,
  simulated: z.boolean(),
  requestedAt: isoText.nullable(),
  releasedAt: isoText.nullable(),
  delivery: z.object({ reportedAt: isoText.nullable(), acknowledgedAt: isoText.nullable(), disputeDeadline: isoText.nullable(), disputeWindowOpen: z.boolean(), releaseEligible: z.boolean() }),
  dispute: z
    .object({ id: z.uuid(), status: z.string().nullable(), reason: z.string().nullable(), openedAt: isoText.nullable(), resolvedAt: isoText.nullable(), awaitingPolicyDecision: z.boolean() })
    .loose()
    .nullable(),
  actions: z.object({ canRelease: z.boolean() }).loose(),
  engagement: z.object({ offerId: z.uuid(), origin: z.string(), campaign: z.object({ id: z.uuid(), reference: z.string(), title: z.string() }).nullable() }),
  feeXaf: z.number().int(),
  netXaf: z.number().int(),
  feeRatePct: z.number(),
  brand: z.object({ id: z.uuid(), name: z.string() }),
  creator: z.object({ id: z.uuid(), username: z.string(), displayName: z.string() }),
});
export type AdminPayment = z.infer<typeof adminPaymentSchema>;
export const adminPaymentListSchema = z.array(adminPaymentSchema);
export const adminPaymentDetailSchema = adminPaymentSchema.extend({
  deliveryReport: z.unknown().nullable().optional(),
  collection: z
    .object({ provider: z.string(), simulated: z.boolean(), status: z.string(), completedAt: isoText.nullable(), payer: z.object({ method: z.string(), last3: z.string() }) })
    .loose()
    .nullable()
    .optional(),
});
export type AdminPaymentDetail = z.infer<typeof adminPaymentDetailSchema>;
export const adminPaymentEnvelopeSchema = z.object({ payment: adminPaymentDetailSchema });
