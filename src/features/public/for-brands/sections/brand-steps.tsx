import type { ForBrandsContent } from "@/types/brand";

export function BrandSteps({ steps }: { steps: ForBrandsContent["steps"] }) {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-surface px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-primary">How it works</p>
        <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-heading sm:text-4xl">
          From brief to results in four steps
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-body">
          No agencies, no guesswork — just the right creators and a safe way to pay them.
        </p>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary-border hover:shadow-lg"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white transition-transform duration-300 group-hover:scale-110">
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-heading">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
