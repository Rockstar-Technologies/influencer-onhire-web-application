import type { Metadata } from "next";
import { CampaignPreviewPage } from "@/features/public/campaign-preview/campaign-preview-page";

export const metadata: Metadata = {
  title: "Campaign Preview | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft } = await searchParams;
  return <CampaignPreviewPage draftId={draft} />;
}
