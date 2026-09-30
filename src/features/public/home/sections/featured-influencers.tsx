import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { InfluencerCard } from "@/components/shared/influencer-card";
import { getFeaturedInfluencers } from "@/services/influencers.service";

export async function FeaturedInfluencers() {
  const influencers = await getFeaturedInfluencers();

  return (
    <section className="bg-surface-alt px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Featured talent</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">Cameroon&apos;s most sought-after creators</h2>
            <p className="mt-4 text-body">Verified influencers with proven reach and a track record of delivering for brands.</p>
          </div>
          <Link
            href="/influencers"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
          >
            Browse all influencers
            <FiArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {influencers.map((influencer) => (
            <InfluencerCard key={influencer.id} influencer={influencer} />
          ))}
        </div>
      </div>
    </section>
  );
}
