import Link from "next/link";
import { FiSearch } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import { InfluencerCard } from "@/components/shared/influencer-card";
import { buildDirectoryHref } from "../../creators/query";
import type { DirectoryQuery } from "../../creators/query";
import { loadDirectory } from "../../creators/server";

/** One page of approved creators from the API. There is no total (the API gives none), so the page says how many it shows and offers the next page. */
export async function InfluencerResults({ query }: { query: DirectoryQuery }) {
  const page = await loadDirectory(query);

  if (page.items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface-alt px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
          <FiSearch size={20} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-heading">{query.cursor ? "No more influencers" : "No influencers match these filters"}</h2>
        <p className="mt-2 max-w-sm text-sm text-body">{query.cursor ? "That was the last page." : "Try removing a filter or searching for a broader term."}</p>
        <Button href={query.cursor ? buildDirectoryHref({ ...query, cursor: "" }) : "/influencers"} variant="outline" className="mt-6 rounded-lg">
          {query.cursor ? "Back to the first page" : "Clear filters"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted">
        Showing <span className="font-semibold text-heading">{page.items.length}</span> {page.items.length === 1 ? "influencer" : "influencers"}
        {query.cursor ? " (next page)" : ""}
      </p>
      <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {page.items.map((influencer) => (
          <InfluencerCard key={influencer.username} influencer={influencer} />
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {query.cursor && (
          <Link href={buildDirectoryHref({ ...query, cursor: "" })} className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
            Back to the first page
          </Link>
        )}
        {page.nextCursor && (
          <Link href={buildDirectoryHref({ ...query, cursor: page.nextCursor })} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
            Show more influencers
          </Link>
        )}
      </div>
    </>
  );
}
