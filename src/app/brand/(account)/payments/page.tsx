import type { Metadata } from "next";
import { BrandPaymentsPage } from "@/features/account/brand-payments/brand-payments-page";
import { requireAccount } from "@/services/session.service";

export const metadata: Metadata = { title: "Payments · Brand · Influencer On Hire" };

export default async function Page() {
  return <BrandPaymentsPage brand={await requireAccount("brand")} />;
}
