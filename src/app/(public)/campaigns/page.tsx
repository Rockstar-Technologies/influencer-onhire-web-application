import type { Metadata } from "next";
import { CampaignsPage } from "@/features/public/campaigns/campaigns-page";

export const metadata: Metadata = {
  title: "Campaigns | Influencer On Hire",
};

export default function Page() {
  return <CampaignsPage />;
}
