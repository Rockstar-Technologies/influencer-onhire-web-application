export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "youtube";
export type MobileMoneyMethod = "mtn_momo" | "orange_money";

// Step 1 — who the creator is
export interface CreatorProfileBasics {
  fullName: string;
  photoDataUrl?: string;
  niche: string;
  city: string;
  bio: string;
}

export interface PlatformAudience {
  platform: SocialPlatform;
  handle: string;
  followers: number;
}

export interface PastCollaboration {
  brand: string;
  description: string;
  year: string;
}

// Step 2 — reach and track record
export interface CreatorAudience {
  platforms: PlatformAudience[];
  collaborations: PastCollaboration[];
  brandFit: string[];
}

export interface PlatformPrice {
  platform: SocialPlatform;
  price: number;
}

export interface PayoutAccount {
  method: MobileMoneyMethod;
  number: string;
}

// Step 3 — how brands book and pay them
export interface CreatorRates {
  prices: PlatformPrice[];
  minimumBooking: string;
  deliverables: string;
  revisions: string;
  usageRights: string;
  depositTerms: string;
  payoutAccounts: PayoutAccount[];
}

export interface CreatorApplicationDraft {
  basics?: CreatorProfileBasics;
  audience?: CreatorAudience;
  rates?: CreatorRates;
}

export interface CreatorApplication {
  id: string;
  status: "under_review";
  submittedAt: string;
  basics: CreatorProfileBasics;
  audience: CreatorAudience;
  rates: CreatorRates;
}

export interface CreatorApplicationOptions {
  niches: string[];
  cities: string[];
  platforms: { id: SocialPlatform; label: string }[];
  brandFit: string[];
  minimumBooking: string[];
  revisions: string[];
  usageRights: string[];
  depositTerms: string[];
  defaultDeliverables: string;
  minFollowers: number;
  minPricePerPlatform: number;
  maxCollaborations: number;
}

export interface ForCreatorsContent {
  hero: { eyebrow: string; title: string; body: string; benefits: string[] };
  steps: { id: string; title: string; description: string }[];
  faqs: { question: string; answer: string }[];
}
