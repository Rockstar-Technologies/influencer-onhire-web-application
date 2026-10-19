import type { Metadata } from "next";
import { PaymentsPage } from "@/features/brand/payments/payments-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Payments & Escrow | Influencer On Hire",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireBrand("/brand/campaign-payments");
  const { q } = await searchParams;
  return <PaymentsPage query={q ?? ""} />;
}
