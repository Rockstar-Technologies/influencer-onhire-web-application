import type { Metadata } from "next";
import { CampaignDetailPage } from "@/features/admin/campaign-detail-page";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Campaign · Admin · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/campaigns/${encodeURIComponent(id)}`, "campaigns.review");
  return <CampaignDetailPage id={id} viewer={{ permissions: session.permissions }} />;
}
