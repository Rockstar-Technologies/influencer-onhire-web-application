import type { Metadata } from "next";
import { BrandPaymentsPage } from "@/features/account/brand-payments/brand-payments-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Payments · Brand · Influencer On Hire" };

export default async function Page() {
  return <BrandPaymentsPage brand={(await requireBrand("/brand/payments")).user} />;
}
