import type { ReactNode } from "react";
import type { BrandFeatureIcon, ForBrandsContent } from "@/types/brand";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<BrandFeatureIcon, ReactNode> = {
  target: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  badge: (
    <svg {...iconProps}>
      <circle cx="12" cy="10" r="6" />
      <path d="M9.5 10l1.8 1.8 3.2-3.3M8.5 15l-1.5 6 5-2.5 5 2.5-1.5-6" />
    </svg>
  ),
  shield: (
    <svg {...iconProps}>
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  wallet: (
    <svg {...iconProps}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M16 14.5h2" />
    </svg>
  ),
  chat: (
    <svg {...iconProps}>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  ),
  chart: (
    <svg {...iconProps}>
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V7M17 16v-7" />
    </svg>
  ),
};

export function BrandFeatures({ features }: { features: ForBrandsContent["features"] }) {
  return (
    <section className="bg-surface-alt px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-primary">Why brands choose us</p>
        <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-heading sm:text-4xl">
          Everything you need to run influencer campaigns
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-body">
          From finding the right voice to paying them safely — one platform built for brands in Cameroon.
        </p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.id}
              className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary-border hover:shadow-xl hover:shadow-primary/10"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                {ICONS[feature.icon]}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-heading">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{feature.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
