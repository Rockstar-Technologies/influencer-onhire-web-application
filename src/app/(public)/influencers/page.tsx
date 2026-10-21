import type { Metadata } from "next";
import { parseDirectoryQuery, type RawSearchParams } from "@/features/public/creators/query";
import { InfluencersPage } from "@/features/public/influencers/influencers-page";

export const metadata: Metadata = { title: "Browse influencers · Influencer On Hire" };

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <InfluencersPage query={parseDirectoryQuery(await searchParams)} />;
}
