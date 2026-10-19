import type { Metadata } from "next";
import { requireBrand } from "@/lib/auth/session";
import { PostCampaignPage } from "@/features/public/direct-campaign/post-campaign-page";

export const metadata: Metadata = {
  title: "Post a Campaign | Influencer On Hire",
  description: "Describe your campaign, set your budget and get matched with verified influencers across Cameroon.",
};

export default async function Page() {
  await requireBrand("/post-campaign");
  return <PostCampaignPage />;
}
