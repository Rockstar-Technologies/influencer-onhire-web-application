import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

export function PostCampaign() {
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

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/campaigns/new"
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
