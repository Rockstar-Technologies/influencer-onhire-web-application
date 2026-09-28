import type { AttentionItem, CampaignSummary, DashboardKpis, DashboardRange, RevenuePoint, TopInfluencer } from "@/types/dashboard";
import { MOCK_CAMPAIGNS, MOCK_PERIOD_KPIS, MOCK_REVENUE } from "./mock/dashboard.mock";
import { getPaymentSummary } from "./payments.service";
import { getSupportStats } from "./support.service";
import {
  countOpenDisputes,
  getUserStats,
  listModerationFlags,
  listSecurityAlerts,
  listTopInfluencers,
} from "./user-management.service";

export async function getDashboardKpis(range: DashboardRange): Promise<DashboardKpis> {
  // TODO: replace with `fetch("/api/admin/dashboard/kpis?range=" + range)`
  const [payments, support] = await Promise.all([getPaymentSummary(), getSupportStats()]);
  // Summed from the chart series so the revenue card and the chart total always agree.
  const revenue = MOCK_REVENUE[range].reduce((sum, point) => sum + point.revenue, 0);
  return {
    activeCampaigns: MOCK_PERIOD_KPIS[range].activeCampaigns,
    platformRevenue: { current: revenue, previous: MOCK_PERIOD_KPIS[range].previousRevenue },
    inEscrow: payments.heldInEscrow,
    payoutRequests: payments.payoutRequests,
    openTickets: support.openTickets,
    urgentTickets: support.urgent,
  };
}

export async function getRevenueSeries(range: DashboardRange): Promise<RevenuePoint[]> {
  // TODO: replace with `fetch("/api/admin/dashboard/revenue?range=" + range)`
  return MOCK_REVENUE[range];
}

export async function listRecentCampaigns(): Promise<CampaignSummary[]> {
  // TODO: replace with `fetch("/api/admin/campaigns?sort=recent&limit=5")`
  return MOCK_CAMPAIGNS;
}

// Everything an admin should act on today, pulled from the same services the detail pages use
// so the counts always match what the admin finds after clicking through.
export async function listAttentionItems(): Promise<AttentionItem[]> {
  const [users, support, alerts, flags, disputes, payments] = await Promise.all([
    getUserStats(),
    getSupportStats(),
    listSecurityAlerts(),
    listModerationFlags(),
    countOpenDisputes(),
    getPaymentSummary(),
  ]);
  const items: AttentionItem[] = [
    { id: "urgent-tickets", label: "Urgent support tickets", count: support.urgent, severity: "urgent", href: "/admin/support?status=open" },
    { id: "security", label: "Security alerts", count: alerts.length, severity: "urgent", href: "/admin/users#alerts-heading" },
    { id: "payouts", label: "Payouts waiting for release", count: payments.payoutRequests, severity: "urgent", href: "/admin/payments?status=requested" },
    { id: "approvals", label: "Accounts awaiting approval", count: users.pendingApproval, severity: "warning", href: "/admin/users?status=pending" },
    { id: "disputes", label: "Open disputes", count: disputes, severity: "warning", href: "/admin/users" },
    { id: "moderation", label: "Reported content to review", count: flags.length, severity: "warning", href: "/admin/users#moderation-heading" },
  ];
  return items.filter((item) => item.count > 0);
}

export async function getTopInfluencers(limit = 4): Promise<TopInfluencer[]> {
  return listTopInfluencers(limit);
}
