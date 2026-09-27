import type { Metadata } from "next";
import { PostCampaignPage } from "@/features/public/post-campaign/post-campaign-page";

export const metadata: Metadata = {
  title: "Post a Campaign | Influencer On Hire",
  description: "Describe your campaign, set your budget and get matched with verified influencers across Cameroon.",
};

export default function Page() {
  return <PostCampaignPage />;
}
