import type { FaqItem } from "./campaign";

export type BrandFeatureIcon = "target" | "shield" | "badge" | "chart" | "chat" | "wallet";

export interface ForBrandsContent {
  hero: { eyebrow: string; title: string; body: string; benefits: string[] };
  stats: { value: string; label: string }[];
  features: { id: string; icon: BrandFeatureIcon; title: string; description: string }[];
  steps: { id: string; title: string; description: string }[];
  faqs: FaqItem[];
}
