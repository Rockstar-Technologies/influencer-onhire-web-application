import { InfluencerCard } from "@/components/shared/influencer-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { getFeaturedInfluencers } from "@/services/influencers.service";

export async function FeaturedInfluencers() {
  const influencers = await getFeaturedInfluencers();

  return (
    <section className="bg-surface px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Featured"
        title="Featured Influencers"
        description="Hand-picked creators with proven reach and results across Cameroon."
      />
      <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {influencers.map((influencer) => (
          <InfluencerCard key={influencer.id} influencer={influencer} />
        ))}
      </div>
    </section>
  );
}
