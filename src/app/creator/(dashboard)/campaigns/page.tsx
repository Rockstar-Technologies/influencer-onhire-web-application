import type { Metadata } from "next";
import { CampaignsBrowsePage } from "@/features/creator/campaigns/campaigns-page";
import { parseCampaignQuery } from "@/features/creator/campaigns/query";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Open campaigns · Creator · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCreator("/creator/campaigns");
  return <CampaignsBrowsePage query={parseCampaignQuery(await searchParams)} />;
}
