import { parseRange, rangeLabel } from "@/features/admin-panel/dashboard/dashboard-range";
import { decideAccess } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { getDashboardKpis, getRevenueSeries, listRecentCampaigns } from "@/services/dashboard.service";

// Quotes every cell and neutralises leading =, +, - and @ so spreadsheet apps can't run it as a formula.
function cell(value: string | number) {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

const row = (...values: (string | number)[]) => values.map(cell).join(",");

const NO_STORE = { "Cache-Control": "no-store" } as const;

// Administrators holding dashboard.export only (the API's permission code). Read-only: this handler never changes state, and any other
// method is refused. 401 without a valid session, 403 for a signed-in user without the permission.
export async function GET(request: Request) {
  const session = await getSession();
  const decision = decideAccess(session, { role: "admin", permission: "dashboard.export" });
  if (!decision.allowed) {
    return new Response(JSON.stringify({ error: decision.reason === "anonymous" ? "unauthorized" : "forbidden" }), {
      status: decision.reason === "anonymous" ? 401 : 403,
      headers: { "Content-Type": "application/json", ...NO_STORE },
    });
  }
  const range = parseRange(new URL(request.url).searchParams.get("range") ?? undefined);
  const [kpis, revenue, campaigns] = await Promise.all([getDashboardKpis(range), getRevenueSeries(range), listRecentCampaigns()]);

  const lines = [
    row("Influencer On Hire dashboard report", rangeLabel(range)),
    row("Generated", new Date().toISOString()),
    "",
    row("Metric", "Current", "Previous period"),
    row("Active campaigns", kpis.activeCampaigns.current, kpis.activeCampaigns.previous),
    row("Platform revenue (CFA)", kpis.platformRevenue.current, kpis.platformRevenue.previous),
    row("Held in escrow (CFA)", kpis.inEscrow, ""),
    row("Payout requests waiting", kpis.payoutRequests, ""),
    row("Open support tickets", kpis.openTickets, ""),
    row("Urgent support tickets", kpis.urgentTickets, ""),
    "",
    row("Period", "Platform revenue (CFA)"),
    ...revenue.map((point) => row(point.label, point.revenue)),
    "",
    row("Campaign", "Brand", "Budget (CFA)", "Delivered", "Influencers", "Due", "Status"),
    ...campaigns.map((c) => row(c.name, c.brand, c.budget, c.delivered, c.influencers, c.endsAt.slice(0, 10), c.status)),
  ];

  const date = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens the file as UTF-8.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dashboard-${range}-${date}.csv"`,
      ...NO_STORE,
    },
  });
}

const refuse = () => new Response(null, { status: 405, headers: { Allow: "GET", ...NO_STORE } });
export const POST = refuse;
export const PUT = refuse;
export const PATCH = refuse;
export const DELETE = refuse;
