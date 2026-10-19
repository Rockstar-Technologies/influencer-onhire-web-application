import type { Metadata } from "next";
import { CampaignRequestsPage } from "@/features/creator/requests/campaign-requests-page";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Campaign Requests | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; cursor?: string | string[] }>;
}) {
  await requireCreator("/creator/requests");
  const { q, cursor } = await searchParams;
  return <CampaignRequestsPage query={typeof q === "string" ? q : ""} {...(typeof cursor === "string" ? { cursor } : {})} />;
}
