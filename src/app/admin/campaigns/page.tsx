import type { Metadata } from "next";
import { CampaignsReviewPage } from "@/features/admin/campaigns-page";
import { parseCampaignQuery } from "@/features/admin/server";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Campaign review · Admin · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/campaigns", "campaigns.review");
  return <CampaignsReviewPage query={parseCampaignQuery(await searchParams)} />;
}
