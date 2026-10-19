import type { Metadata } from "next";
import { requireBrand } from "@/lib/auth/session";
import { PostCampaignPage } from "@/features/public/post-campaign/post-campaign-page";

export const metadata: Metadata = {
  title: "Post a Campaign | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  await requireBrand("/campaigns/new");
  const { draft } = await searchParams;
  return <PostCampaignPage draftId={draft} />;
}
