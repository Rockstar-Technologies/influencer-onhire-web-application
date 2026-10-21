import type { Metadata } from "next";
import { CampaignDetailPage } from "@/features/creator/campaigns/campaign-detail-page";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Campaign · Creator · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCreator(`/creator/campaigns/${encodeURIComponent(id)}`);
  return <CampaignDetailPage id={id} />;
}
