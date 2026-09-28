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

export type CampaignStatus = "draft" | "scheduled" | "in-progress" | "pending-review" | "completed" | "overdue";

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
