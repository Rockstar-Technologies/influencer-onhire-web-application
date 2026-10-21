import { CreatorAvatar } from "@/components/shared/creator-avatar";
import { buildSearchOptions } from "../../creators/query";
import { loadFeatured, loadFilters } from "../../creators/server";
import { HeroSearch } from "./hero-search";

function FlagStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="currentColor" d="M12 1.5l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.27l-6.18 3.23L7 13.63 2 8.76l6.91-1z" />
    </svg>
  );
}

// Green–red–yellow, left to right, like the flag itself.
function FlagStripe({ className }: { className?: string }) {
  return (
    <span aria-hidden className={`flex overflow-hidden rounded-full ${className ?? ""}`}>
      <span className="flex-1 bg-flag-green" />
      <span className="flex-1 bg-flag-red" />
      <span className="flex-1 bg-flag-yellow" />
    </span>
  );
}

export async function Hero() {
  const [filters, featured] = await Promise.all([loadFilters(), loadFeatured(5)]);
  const searchOptions = buildSearchOptions(filters);
  const faces = featured.items;

  return (
    <section className="relative overflow-hidden bg-surface px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(42rem_26rem_at_8%_-10%,rgb(0_122_94/0.10),transparent_70%),radial-gradient(38rem_24rem_at_95%_0%,rgb(252_209_22/0.14),transparent_70%)]"
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-surface/80 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
          <span aria-hidden className="relative flex h-3 w-[18px] overflow-hidden rounded-[2px]">
            <span className="flex-1 bg-flag-green" />
            <span className="relative flex-1 bg-flag-red">
              <FlagStar className="absolute inset-0 m-auto h-2 w-2 text-flag-yellow" />
            </span>
            <span className="flex-1 bg-flag-yellow" />
          </span>
          Cameroon&apos;s Trusted Influencer Marketplace
        </span>

        <h1 className="mt-8 font-display text-[2.5rem] leading-none font-extrabold tracking-tight uppercase sm:text-6xl lg:text-7xl">
          <span className="text-flag-green">Influencers</span>{" "}
          <span className="whitespace-nowrap">
            <span className="text-flag-red">
              <span className="relative inline-block">
                O
                <FlagStar className="absolute -top-[0.42em] left-1/2 h-[0.42em] w-[0.42em] -translate-x-1/2 text-flag-yellow drop-shadow-[0_1px_1px_rgb(0_0_0/0.25)]" />
              </span>
              N
            </span>{" "}
            {/* Flag yellow alone is unreadable on white, so it gets a gold outline painted behind the fill. */}
            <span className="text-flag-yellow [-webkit-text-stroke:4px_#b58900] [paint-order:stroke_fill]">Hire</span>
          </span>
        </h1>

        <FlagStripe className="mt-6 h-1.5 w-32" />

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-body">
          Connect your brand with Cameroon&apos;s top influencers. Hire, collaborate and pay securely, all in one place.
        </p>

        <HeroSearch options={searchOptions} />

        {faces.length > 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <div role="group" aria-label="Some of our approved creators" className="flex -space-x-3">
              {faces.map((influencer) => (
                <CreatorAvatar key={influencer.username} name={influencer.displayName} className="h-10 w-10 text-xs ring-2 ring-surface" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
