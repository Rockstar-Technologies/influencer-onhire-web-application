import { Button } from "@/components/shared/button";
import { SectionHeading } from "@/components/shared/section-heading";
import { getPlatformStats } from "@/services/platform.service";

export async function PostCampaign() {
  const stats = await getPlatformStats();

  return (
    <section className="bg-surface px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="For Brands"
        title="Post a Campaign"
        description="Describe what you need, set your budget, and get matched with the right influencer — backed by secure escrow payments."
        className="max-w-xl"
      />

      <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col px-6">
            <dt className="order-2 mt-1 text-xs text-body">{stat.label}</dt>
            <dd className="order-1 text-4xl font-extrabold text-primary">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href="/coming-soon?title=Post+a+Campaign" className="rounded-lg px-7 py-3.5">
          Post Your Campaign Now
        </Button>
        <Button href="/influencers" variant="outline" className="rounded-lg px-7 py-3.5">
          Browse Influencers First
        </Button>
      </div>
    </section>
  );
}
