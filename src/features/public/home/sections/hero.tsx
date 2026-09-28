import { getInfluencerSearchOptions } from "@/services/influencers.service";
import { HeroSearch } from "./hero-search";

export async function Hero() {
  const searchOptions = await getInfluencerSearchOptions();

  return (
    <section className="bg-linear-to-br from-primary-light via-surface-alt to-surface px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary">
          <span className="text-[9px] font-bold">CM</span>
          Cameroon&apos;s Trusted Influencer Marketplace
        </span>

        <h1 className="mt-6 text-4xl font-extrabold uppercase tracking-tight text-heading sm:text-6xl">
          Influencers <span className="text-primary">On Hire</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-body">
          Find, hire, and pay the right influencers for your brand, product&amp;Services. Connect with
          Trusted Influencers in Minutes across Cameroon.
        </p>

        <HeroSearch options={searchOptions} />
      </div>
    </section>
  );
}
