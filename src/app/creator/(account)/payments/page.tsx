import type { Metadata } from "next";
import { CreatorPaymentsPage } from "@/features/payments/creator-payments-page";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Earnings · Creator · Influencer On Hire" };

export default async function Page() {
  await requireCreator("/creator/payments");
  return <CreatorPaymentsPage returnTo="/creator/payments" />;
}
