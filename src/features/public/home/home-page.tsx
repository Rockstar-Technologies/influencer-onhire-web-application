import { FeaturedInfluencers } from "./sections/featured-influencers";
import { Hero } from "./sections/hero";
import { PostCampaign } from "./sections/post-campaign";
import { TrustBar } from "./sections/trust-bar";

export function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <PostCampaign />
      <FeaturedInfluencers />
    </>
  );
}
