import type { Metadata } from "next";
import { BrandPaymentsPage } from "@/features/account/brand-payments/brand-payments-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Payments · Brand · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<{ cursor?: string | string[] }> }) {
  await requireBrand("/brand/payments");
  const { cursor } = await searchParams;
  return <BrandPaymentsPage {...(typeof cursor === "string" ? { cursor } : {})} />;
}
