import type { Metadata } from "next";
import { BrandOffersPage } from "@/features/offers/brand/brand-offers-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My hires · Brand · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string | string[]; cursor?: string | string[] }> }) {
  await requireBrand("/brand/offers");
  const { status, cursor } = await searchParams;
  return <BrandOffersPage {...(typeof status === "string" ? { status } : {})} {...(typeof cursor === "string" ? { cursor } : {})} />;
}
