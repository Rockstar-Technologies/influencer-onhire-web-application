import type { Metadata } from "next";
import { DashboardPage } from "@/features/admin-panel/dashboard/dashboard-page";
import { parseRange } from "@/features/admin-panel/dashboard/dashboard-range";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin");
  return <DashboardPage range={parseRange((await searchParams).range)} />;
}
