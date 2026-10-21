import type { Metadata } from "next";
import { CampaignsListPage } from "@/features/brand/campaigns/campaigns-list-page";
import { requireBrand } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My campaigns · Brand · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string | string[]; cursor?: string | string[] }> }) {
  await requireBrand("/brand/campaigns");
  const { status, cursor } = await searchParams;
  return <CampaignsListPage {...(typeof status === "string" ? { status } : {})} {...(typeof cursor === "string" ? { cursor } : {})} />;
}
