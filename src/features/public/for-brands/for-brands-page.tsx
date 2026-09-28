import { getForBrandsContent } from "@/services/brands.service";
import { listEngagementRateOptions, listMatchFilterOptions } from "@/services/campaigns.service";
import { listEscrowSteps } from "@/services/payments.service";
import { BrandEscrow } from "./sections/brand-escrow";
import { BrandFaq } from "./sections/brand-faq";
import { BrandFeatures } from "./sections/brand-features";
import { BrandStats } from "./sections/brand-stats";
import { BrandSteps } from "./sections/brand-steps";
import { BrandsCta } from "./sections/brands-cta";
import { BrandsHero } from "./sections/brands-hero";
import { CreatorMatchFinder } from "./sections/creator-match-finder";

export async function ForBrandsPage() {
  const [content, filterOptions, engagementOptions, escrowSteps] = await Promise.all([
    getForBrandsContent(),
    listMatchFilterOptions(),
    listEngagementRateOptions(),
    listEscrowSteps(),
  ]);

  return (
    <>
      <BrandsHero
        hero={content.hero}
        finder={<CreatorMatchFinder options={filterOptions} engagementOptions={engagementOptions} />}
      />
      <BrandStats stats={content.stats} />
      <BrandFeatures features={content.features} />
      <BrandSteps steps={content.steps} />
      <BrandEscrow steps={escrowSteps} />
      <BrandFaq faqs={content.faqs} />
      <BrandsCta />
    </>
  );
}
