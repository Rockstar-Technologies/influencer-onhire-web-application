import type { Metadata } from "next";
import { CampaignDetailPage } from "@/features/brand/campaigns/campaign-detail-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Campaign · Brand · Influencer On Hire" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string | string[] }> }) {
  const { id } = await params;
  await requireBrand(`/brand/campaigns/${encodeURIComponent(id)}`);
  const { submitted } = await searchParams;
  return <CampaignDetailPage id={id} justSubmitted={submitted === "1"} />;
}
