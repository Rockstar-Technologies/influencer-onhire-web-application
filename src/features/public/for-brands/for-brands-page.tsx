import { getForBrandsContent } from "@/services/brands.service";
import { listEscrowSteps } from "@/services/payments.service";
import { BrandEscrow } from "./sections/brand-escrow";
import { BrandFaq } from "./sections/brand-faq";
import { BrandFeatures } from "./sections/brand-features";
import { BrandSteps } from "./sections/brand-steps";
import { BrandsCta } from "./sections/brands-cta";
import { BrandsHero } from "./sections/brands-hero";

export async function ForBrandsPage() {
  const [content, escrowSteps] = await Promise.all([getForBrandsContent(), listEscrowSteps()]);

  return (
    <>
      <BrandsHero hero={content.hero} />
      <BrandFeatures features={content.features} />
      <BrandSteps steps={content.steps} />
      <BrandEscrow steps={escrowSteps} />
      <BrandFaq faqs={content.faqs} />
      <BrandsCta />
    </>
  );
}
