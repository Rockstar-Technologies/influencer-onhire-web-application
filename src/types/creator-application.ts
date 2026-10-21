import type { PaymentMethodCode, PlatformCode } from "@/lib/domain/vocabulary";

// The application wizard's data now comes from the API (see src/features/creator-application and src/lib/api/schemas.ts).
// Only the shared vocabulary aliases and the static "For creators" marketing content types remain here.
export type SocialPlatform = PlatformCode;
export type MobileMoneyMethod = PaymentMethodCode;

export interface ForCreatorsContent {
  hero: { eyebrow: string; title: string; body: string; benefits: string[] };
  steps: { id: string; title: string; description: string }[];
  faqs: { question: string; answer: string }[];
}
