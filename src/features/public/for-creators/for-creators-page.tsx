import { getForCreatorsContent } from "@/services/creator-application.service";
import { CreatorFaq } from "./sections/creator-faq";
import { CreatorSteps } from "./sections/creator-steps";
import { CreatorsHero } from "./sections/creators-hero";
import { StartProfileCard } from "./sections/start-profile-card";

export async function ForCreatorsPage() {
  const content = await getForCreatorsContent();

  return (
    <>
      <CreatorsHero hero={content.hero} application={<StartProfileCard />} />
      <CreatorSteps steps={content.steps} />
      <CreatorFaq faqs={content.faqs} />
    </>
  );
}
