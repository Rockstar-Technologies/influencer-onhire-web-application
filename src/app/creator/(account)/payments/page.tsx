import type { Metadata } from "next";
import { CreatorPaymentsPage } from "@/features/account/creator-payments/creator-payments-page";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Earnings · Creator · Influencer On Hire" };

export default async function Page() {
  return <CreatorPaymentsPage creator={(await requireCreator("/creator/payments")).user} />;
}
