import type { CampaignStatus } from "@/lib/domain/vocabulary";

import type { FilterOption } from "./influencer-filters";

export interface CampaignFormOptions {
  niches: FilterOption[];
  locations: FilterOption[];
  ageRanges: FilterOption[];
  interests: FilterOption[];
  engagementLevels: FilterOption[];
}

export interface CampaignLifecycleStep {
  label: string;
  tone: "warning" | "primary" | "success";
}

export interface CampaignFaq {
  question: string;
  answer: string;
}

// Static help content shown next to the form.
export interface CampaignGuidance {
  lifecycle: CampaignLifecycleStep[];
  lifecycleNote: string;
  smartMatching: string[];
  securePoints: string[];
  faqs: CampaignFaq[];
}

// What the brand fills in. Values are strings straight from the form.
export interface CampaignInput {
  title: string;
  niche: string;
  budget: number;
  startDate: string;
  endDate: string;
  deliverables: string;
  minEngagement: string;
  ageRanges: string[];
  locations: string[];
  interests: string[];
  referenceImageCount: number;
}

export interface Campaign extends CampaignInput {
  id: string;
  reference: string;
  status: Extract<CampaignStatus, "pending_review">;
  // Verified influencers the campaign was sent to.
  matchedCount: number;
  createdAt: string;
}

export interface ReachCriteria {
  niche: string;
  locations: string[];
  minEngagement: string;
}

// --- form state (shared by the server action and the client form) ---

export type CampaignRequiredField = "title" | "niche" | "budget" | "startDate" | "endDate" | "deliverables";

export type CampaignFormField = CampaignRequiredField | "minEngagement";

export type CampaignFormErrors = Partial<Record<CampaignFormField, string>>;

export interface CampaignFormValues {
  title: string;
  niche: string;
  // Digits only, e.g. "500000".
  budget: string;
  startDate: string;
  endDate: string;
  deliverables: string;
  minEngagement: string;
}

export type CampaignSubmitResult =
  | { status: "error"; errors: CampaignFormErrors; message: string }
  | { status: "success"; campaign: Campaign };
