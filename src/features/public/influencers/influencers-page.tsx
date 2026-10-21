import type { DirectoryQuery } from "../creators/query";
import { BrowseHeader } from "./sections/browse-header";
import { InfluencerBrowser } from "./sections/influencer-browser";

export function InfluencersPage({ query }: { query: DirectoryQuery }) {
  return (
    <>
      <BrowseHeader />
      <InfluencerBrowser query={query} />
    </>
  );
}
