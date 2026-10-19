import type { Metadata } from "next";
import { NewCampaignPage } from "@/features/brand/campaigns/new-campaign-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Post a Campaign | Influencer On Hire",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ draft?: string | string[]; budget?: string | string[] }> }) {
  await requireBrand("/campaigns/new");
  const { draft, budget } = await searchParams;
  return <NewCampaignPage {...(typeof draft === "string" ? { draftId: draft } : {})} {...(typeof budget === "string" ? { budget } : {})} />;
}
