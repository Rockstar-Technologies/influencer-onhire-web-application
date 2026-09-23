import { FiChevronDown, FiGlobe, FiSliders } from "react-icons/fi";

export function Hero() {
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

        <form
          action="/coming-soon"
          className="mt-10 w-full rounded-2xl border border-border bg-surface p-5 text-left shadow-sm"
        >
          <input type="hidden" name="title" value="Browse Influencers" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              name="q"
              placeholder="Search by username or description — e.g. @amara.styles, beauty, fitness..."
              className="h-11 flex-1 rounded-md border border-border bg-surface-alt px-4 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="h-10 rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Search
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-surface-alt px-4 text-xs font-semibold text-heading"
            >
              <FiGlobe className="text-sky-500" />
              EN
              <FiChevronDown />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <FiSliders className="text-muted" />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-4 py-2 text-xs font-medium text-heading"
            >
              Recommended
              <FiChevronDown />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
