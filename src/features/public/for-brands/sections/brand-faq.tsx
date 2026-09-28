import { Button } from "@/components/shared/button";
import type { ForBrandsContent } from "@/types/brand";

function ChevronIcon() {
  return (
    <svg
      className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180 group-hover:text-primary"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandFaq({ faqs }: { faqs: ForBrandsContent["faqs"] }) {
  return (
    <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl">Questions brands ask</h2>
          <p className="mt-3 text-body">Still unsure? Our team is happy to help you plan your first campaign.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/contact">Talk to Our Team</Button>
            <Button href="/brand/payments" variant="outline">
              Brand Dashboard
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-border bg-surface transition-colors hover:border-primary-border open:border-primary-border open:bg-primary-light/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-heading [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronIcon />
              </summary>
              <p className="px-5 pb-4 leading-relaxed text-body">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
