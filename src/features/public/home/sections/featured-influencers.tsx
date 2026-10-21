import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { InfluencerCard } from "@/components/shared/influencer-card";
import { loadFeatured } from "../../creators/server";

/** The first page of "recommended" creators from the API (top-rated first). Hidden if there are none, rather than showing an empty promise. */
export async function FeaturedInfluencers() {
  const { items } = await loadFeatured(6);
  if (items.length === 0) return null;

  return (
    <section className="bg-surface-alt px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Featured talent</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">Creators on Influencer On Hire</h2>
            <p className="mt-4 text-body">Every creator is reviewed by our team before their profile goes live. Ratings and success rates appear once they have completed work.</p>
          </div>
          <Link href="/influencers" className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover">
            Browse all influencers
            <FiArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((influencer) => (
            <InfluencerCard key={influencer.username} influencer={influencer} />
          ))}
        </div>
      </div>
    </section>
  );
}
