import type { AboutContent } from "@/types/about";

export function AboutIntro({ intro, facts }: Pick<AboutContent, "intro" | "facts">) {
  return (
    <section className="bg-surface-alt px-4 pb-14 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary">
            {intro.eyebrow}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-heading sm:text-5xl">
            {intro.title} <span className="text-primary">{intro.highlight}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-body">{intro.body}</p>
        </div>

        <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border-light sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="bg-surface p-6">
              <dt className="text-3xl font-extrabold text-primary">{fact.value}</dt>
              <dd className="mt-1 text-sm text-body">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
