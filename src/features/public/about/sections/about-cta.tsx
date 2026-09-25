import Link from "next/link";
import type { AboutContent } from "@/types/about";

// Dark navy band that runs straight into the footer, matching the "For Influencers" section.
export function AboutCta({ closing }: Pick<AboutContent, "closing">) {
  return (
    <section className="bg-[#0b1220] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">{closing.title}</h2>
        <p className="mt-4 max-w-2xl text-slate-300">{closing.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={closing.primary.href}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            {closing.primary.label}
          </Link>
          <Link
            href={closing.secondary.href}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            {closing.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
