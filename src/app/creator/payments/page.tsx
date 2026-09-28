import type { Metadata } from "next";
import { CreatorPaymentsPage } from "@/features/account/creator-payments/creator-payments-page";
import { requireAccount } from "@/services/session.service";

export const metadata: Metadata = { title: "Earnings · Creator · Influencer On Hire" };

export default async function Page() {
  return <CreatorPaymentsPage creator={await requireAccount("influencer")} />;
}
