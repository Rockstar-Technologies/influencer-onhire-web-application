import { getInfluencerSearchOptions } from "@/services/influencers.service";
import type { InfluencerQuery } from "@/types/influencer-filters";
import { InfluencerResults } from "./influencer-results";
import { InfluencerSearch } from "./influencer-search";

export async function InfluencerBrowser({ query }: { query: InfluencerQuery }) {
  const options = await getInfluencerSearchOptions();

  return (
    <section className="bg-surface px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <InfluencerSearch options={options} query={query}>
          <InfluencerResults query={query} />
        </InfluencerSearch>
      </div>
    </section>
  );
}
