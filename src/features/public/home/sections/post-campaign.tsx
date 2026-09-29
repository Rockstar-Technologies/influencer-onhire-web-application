import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { getPlatformStats } from "@/services/platform.service";

export async function PostCampaign() {
  const stats = await getPlatformStats();

  return (
    <section className="relative overflow-hidden bg-ink px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <span aria-hidden className="absolute inset-x-0 top-0 flex h-1">
        <span className="flex-1 bg-flag-green" />
        <span className="flex-1 bg-flag-red" />
        <span className="flex-1 bg-flag-yellow" />
      </span>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_24rem_at_85%_110%,rgb(0_122_94/0.35),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-5xl text-center">
        <span className="text-xs font-bold tracking-[0.2em] text-accent uppercase">For brands</span>
        <h2 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Put your brand in front of Cameroon&apos;s biggest audiences
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-white/70">
          Describe what you need, set your budget and get matched with the right influencer, backed by secure escrow payments.
        </p>

        <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col px-6">
              <dt className="order-2 mt-2 text-sm text-white/60">{stat.label}</dt>
              <dd className="order-1 font-display text-4xl font-extrabold text-accent sm:text-5xl">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/post-campaign"
            className="group inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-accent-hover"
          >
            Post Your Campaign
            <FiArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/influencers"
            className="inline-flex items-center rounded-lg border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Browse Influencers First
          </Link>
        </div>
      </div>
    </section>
  );
}
