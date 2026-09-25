import type { Metadata } from "next";
import { CampaignRequestsPage } from "@/features/creator/requests/campaign-requests-page";

export const metadata: Metadata = {
  title: "Campaign Requests | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <CampaignRequestsPage query={q ?? ""} />;
}
