import { Button } from "@/components/shared/button";
import type { AboutContent } from "@/types/about";

export function HowItWorks({ guides }: Pick<AboutContent, "guides">) {
  return (
    <section className="bg-surface-alt px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold text-heading sm:text-4xl">How it works</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-body">
          One platform, two sides — each with a simple path from first step to getting paid.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {guides.map((guide) => (
            <article key={guide.id} className="flex flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{guide.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-bold text-heading">{guide.title}</h3>
              <ol className="mt-6 flex flex-1 flex-col gap-4">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <p className="pt-1 leading-relaxed text-body">{step}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <Button href={guide.cta.href} variant={guide.id === "brands" ? "primary" : "outline"}>
                  {guide.cta.label}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
