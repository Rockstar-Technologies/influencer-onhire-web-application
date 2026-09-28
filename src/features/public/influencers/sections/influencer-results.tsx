import { FiSearch } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import { InfluencerCard } from "@/components/shared/influencer-card";
import { searchInfluencers } from "@/services/influencers.service";
import type { InfluencerQuery } from "@/types/influencer-filters";

export async function InfluencerResults({ query }: { query: InfluencerQuery }) {
  const influencers = await searchInfluencers(query);

  if (influencers.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface-alt px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
          <FiSearch size={20} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-heading">No influencers match these filters</h2>
        <p className="mt-2 max-w-sm text-sm text-body">Try removing a filter or searching for a broader term.</p>
        <Button href="/influencers" variant="outline" className="mt-6 rounded-lg">
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted">
        <span className="font-semibold text-heading">{influencers.length}</span>{" "}
        {influencers.length === 1 ? "influencer" : "influencers"} found
      </p>
      <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {influencers.map((influencer) => (
          <InfluencerCard key={influencer.id} influencer={influencer} />
        ))}
      </div>
    </>
  );
}
