import Link from "next/link";

// Dark navy band that runs straight into the footer, matching the About page closing.
export function BrandsCta() {
  return (
    <section className="bg-[#0b1220] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to launch your next campaign?</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Post your brief in minutes and let verified creators across Cameroon come to you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/campaigns/new"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30"
          >
            Post a Campaign
          </Link>
          <Link
            href="#find-creators"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/10"
          >
            Find Creators
          </Link>
        </div>
      </div>
    </section>
  );
}
