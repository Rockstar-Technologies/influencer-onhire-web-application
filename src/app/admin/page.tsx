import type { Metadata } from "next";
import { DashboardPage } from "@/features/admin-panel/dashboard/dashboard-page";
import { parseRange } from "@/features/admin-panel/dashboard/dashboard-range";

export const metadata: Metadata = { title: "Dashboard · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DashboardPage range={parseRange((await searchParams).range)} />;
}
