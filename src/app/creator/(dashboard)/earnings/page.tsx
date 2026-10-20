import type { Metadata } from "next";
import { CreatorPaymentsPage } from "@/features/payments/creator-payments-page";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Earnings & Payouts | Influencer On Hire",
};

export default async function Page() {
  await requireCreator("/creator/earnings");
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <CreatorPaymentsPage returnTo="/creator/earnings" />
    </div>
  );
}
