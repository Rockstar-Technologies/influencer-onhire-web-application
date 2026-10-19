import type { CampaignDisplayStatus } from "@/lib/domain/frontend-only";

export type DashboardRange = "7d" | "30d" | "90d";

export interface PeriodValue {
  current: number;
  previous: number;
}

export interface DashboardKpis {
  activeCampaigns: PeriodValue;
  // Platform fees earned, not the gross money moving through escrow.
  platformRevenue: PeriodValue;
  inEscrow: number;
  payoutRequests: number;
  openTickets: number;
  urgentTickets: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
}

// "scheduled" and "overdue" are derived display states, not API statuses (see src/lib/domain/frontend-only.ts).
export type CampaignStatus = CampaignDisplayStatus;

export interface CampaignSummary {
  id: string;
  name: string;
  brand: string;
  budget: number;
  influencers: number;
  delivered: number;
  endsAt: string;
  status: CampaignStatus;
}

export interface AttentionItem {
  id: string;
  label: string;
  count: number;
  severity: "urgent" | "warning";
  href: string;
}

export interface TopInfluencer {
  id: string;
  name: string;
  niche: string;
  earnings: number;
  rating: number;
  successRate: number;
}
