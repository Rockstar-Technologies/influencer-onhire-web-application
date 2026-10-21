import type { Metadata } from "next";
import { FundPage } from "@/features/funding/fund-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pay for a booking · Brand · Influencer On Hire" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireBrand(`/brand/offers/${encodeURIComponent(id)}/fund`);
  return <FundPage offerId={id} />;
}
