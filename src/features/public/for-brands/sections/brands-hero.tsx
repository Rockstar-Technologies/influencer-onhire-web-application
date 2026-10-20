import Link from "next/link";
import type { ForBrandsContent } from "@/types/brand";

function CheckIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-primary-border" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandsHero({ hero }: { hero: ForBrandsContent["hero"] }) {
  return (
    <section className="relative overflow-hidden bg-[#0b1220] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="relative mx-auto grid max-w-3xl items-start gap-10">
        <div className="lg:pt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-border">{hero.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">{hero.title}</h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">{hero.body}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {hero.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-2.5 text-sm text-slate-200">
                <CheckIcon />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/campaigns/new"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30"
            >
              Post a Campaign
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/10"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
