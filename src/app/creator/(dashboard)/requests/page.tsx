import type { Metadata } from "next";
import { CampaignRequestsPage } from "@/features/creator/requests/campaign-requests-page";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Campaign Requests | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCreator("/creator/requests");
  const { q } = await searchParams;
  return <CampaignRequestsPage query={q ?? ""} />;
}
