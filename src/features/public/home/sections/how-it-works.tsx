import { FiCheckCircle, FiLock, FiSearch } from "react-icons/fi";

// Mirrors the escrow flow in the payments service: brand funds, money is held, released on confirmed delivery.
const STEPS = [
  {
    title: "Find the right voice",
    body: "Search verified creators by niche, city, language and audience size. Every profile shows real reach and pricing.",
    Icon: FiSearch,
  },
  {
    title: "Pay into escrow",
    body: "Fund the campaign with MTN MoMo or Orange Money. We hold the money safely while the creator works.",
    Icon: FiLock,
  },
  {
    title: "Get results, then release",
    body: "The creator posts and submits proof of delivery. Payment is only released once the work is confirmed.",
    Icon: FiCheckCircle,
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">How it works</span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">From brief to results, protected at every step</h2>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ title, body, Icon }, index) => (
            <li key={title} className="relative rounded-2xl border border-border bg-surface p-7 transition-shadow hover:shadow-lg hover:shadow-ink/5">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <Icon size={22} aria-hidden />
                </span>
                <span className="font-display text-4xl font-extrabold text-border" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-6 font-display text-lg font-bold text-heading">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
