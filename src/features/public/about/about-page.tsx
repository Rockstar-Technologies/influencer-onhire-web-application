import { getAboutContent } from "@/services/about.service";
import { AboutCta } from "./sections/about-cta";
import { AboutIntro } from "./sections/about-intro";
import { HowItWorks } from "./sections/how-it-works";
import { OurStory } from "./sections/our-story";
import { OurValues } from "./sections/our-values";

export async function AboutPage() {
  const content = await getAboutContent();

  return (
    <>
      <AboutIntro intro={content.intro} facts={content.facts} />
      <OurStory story={content.story} />
      <HowItWorks guides={content.guides} />
      <OurValues values={content.values} />
      <AboutCta closing={content.closing} />
    </>
  );
}
