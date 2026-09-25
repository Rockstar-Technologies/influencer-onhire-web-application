import type { Metadata } from "next";
import { CampaignPostedPage } from "@/features/public/campaign-posted/campaign-posted-page";

export const metadata: Metadata = {
  title: "Campaign Posted | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <CampaignPostedPage campaignId={id} />;
}
