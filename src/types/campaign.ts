import type { CampaignStatus as ApiCampaignStatus } from "@/lib/domain/vocabulary";

export interface CampaignStep {
  id: string;
  title: string;
  description: string;
}

export interface CampaignOverview {
  steps: CampaignStep[];
}

export interface PreviewCreator {
  id: string;
  name: string;
  platform: string;
  price: number;
}

export interface PreviewPackage {
  name: string;
  price: number;
}

export interface CampaignPreview {
  creators: PreviewCreator[];
  featured: {
    name: string;
    niches: string[];
    packages: PreviewPackage[];
  };
}

/** The part of the API's campaign lifecycle this legacy screen describes (see src/lib/domain/vocabulary.ts for all eight statuses). */
export type CampaignStatus = Extract<ApiCampaignStatus, "pending_review" | "accepted" | "in_progress">;

export interface NewCampaignInput {
  title: string;
  budget: number;
  startDate: string;
  endDate: string;
  deliverables: string;
  durationDays?: number;
  minEngagementRate?: number;
  ageRange?: string;
  location?: string;
  interests?: string;
  referenceImageNames: string[];
}

export interface CampaignMatchSummary {
  matchedCount: number;
  niches: string[];
  locations: string[];
  minEngagementRate?: number;
}

export interface Campaign extends NewCampaignInput {
  id: string;
  status: CampaignStatus;
  createdAt: string;
  match: CampaignMatchSummary;
}

export interface MatchableInfluencer {
  id: string;
  name: string;
  niche: string;
  city: string;
  engagementRate: number;
  verified: boolean;
  active: boolean;
  hasConflictingDeal: boolean;
}

export interface EngagementRateOption {
  value: number;
  label: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}



export type MatchStrength = "strong" | "good";

export interface MatchedInfluencer {
  id: string;
  name: string;
  initials: string;
  niche: string;
  city: string;
  engagementRate: number;
  strength: MatchStrength;
}

export interface CampaignMatchPreview {
  summary: CampaignMatchSummary;
  topMatches: MatchedInfluencer[];
  // Set when the first location alone had too few matches and the search was widened.
  broadened?: { primaryLocation: string; addedLocations: string[] };
}

export interface MatchFilterOptions {
  niches: string[];
  cities: string[];
}
