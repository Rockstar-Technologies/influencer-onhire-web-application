import type { InfluencerQuery } from "@/types/influencer-filters";
import { BrowseHeader } from "./sections/browse-header";
import { InfluencerBrowser } from "./sections/influencer-browser";

export function InfluencersPage({ query }: { query: InfluencerQuery }) {
  return (
    <>
      <BrowseHeader />
      <InfluencerBrowser query={query} />
    </>
  );
}
