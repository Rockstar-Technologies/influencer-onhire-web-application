import { parseInfluencerQuery, type RawSearchParams } from "@/features/public/influencers/influencer-query";
import { InfluencersPage } from "@/features/public/influencers/influencers-page";

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <InfluencersPage query={parseInfluencerQuery(await searchParams)} />;
}
