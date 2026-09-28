import type { AboutContent } from "@/types/about";

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OurValues({ values }: Pick<AboutContent, "values">) {
  return (
    <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold text-heading sm:text-4xl">What we stand for</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => (
            <div key={value.id}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                <CheckIcon />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-heading">{value.title}</h3>
              <p className="mt-2 leading-relaxed text-body">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
