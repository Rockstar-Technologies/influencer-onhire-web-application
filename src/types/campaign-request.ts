import type { OfferStatus } from "@/lib/domain/vocabulary";

/** A creator-facing request is an API offer; all eight offer statuses can occur (pending, accepted, declined, withdrawn, cancelled, expired, funding_expired, refunded). */
export type CampaignRequestStatus = OfferStatus;

export interface CampaignRequest {
  id: string;
  campaignTitle: string;
  brandName: string;
  niche: string;
  city: string;
  budget: number;
  durationDays: number;
  deliverablesSummary: string;
  matchReasons: string[];
  receivedAt: string;
  status: CampaignRequestStatus;
  respondedAt?: string;
  declineReason?: string;
}

export interface CreatorWorkload {
  activeCampaigns: number;
  maxActiveCampaigns: number;
}

export interface CampaignRequestResponse {
  requestId: string;
  response: "accepted" | "declined";
  declineReason?: string;
}
