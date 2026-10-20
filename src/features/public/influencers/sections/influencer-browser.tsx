import { buildSearchOptions } from "../../creators/query";
import type { DirectoryQuery } from "../../creators/query";
import { loadFilters } from "../../creators/server";
import { InfluencerResults } from "./influencer-results";
import { InfluencerSearch } from "./influencer-search";

export async function InfluencerBrowser({ query }: { query: DirectoryQuery }) {
  const options = buildSearchOptions(await loadFilters());

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
