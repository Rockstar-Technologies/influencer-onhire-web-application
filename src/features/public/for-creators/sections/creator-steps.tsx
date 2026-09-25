import type { ForCreatorsContent } from "@/types/creator-application";

export function CreatorSteps({ steps }: { steps: ForCreatorsContent["steps"] }) {
  return (
    <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-heading sm:text-4xl">From sign-up to payday</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-body">Four simple steps — no agents, no chasing payments.</p>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.id} className="rounded-2xl border border-border bg-surface-alt p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-heading">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
