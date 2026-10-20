import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { loadPublicProfile } from "../creators/server";
import { About } from "./sections/about";
import { BrandFit } from "./sections/brand-fit";
import { ContentStyle } from "./sections/content-style";
import { ContractTerms } from "./sections/contract-terms";
import { EngagementRate } from "./sections/engagement-rate";
import { PastCollaborations } from "./sections/past-collaborations";
import { PlatformPricing } from "./sections/platform-pricing";
import { ProfileHeader } from "./sections/profile-header";

/** A public profile, built only from the API's public fields. A creator who is not public (unknown, pending, suspended...) is the normal "not found" page. */
export async function InfluencerProfilePage({ username }: { username: string }) {
  const profile = await loadPublicProfile(username);
  const firstName = profile.displayName.split(" ")[0] ?? profile.displayName;

  return (
    <div className="bg-surface px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/influencers" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
          <FiArrowLeft />
          Back to Influencers
        </Link>

        <ProfileHeader profile={profile} firstName={firstName} />

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            <About firstName={firstName} bio={profile.bio} />
            <PastCollaborations collaborations={profile.collaborations} />
            <ContentStyle contentStyle={profile.contentStyle} />
            <BrandFit brandFit={profile.brandFit} />
          </div>

          <div className="space-y-6">
            <EngagementRate engagementRate={profile.engagementRatePct} verified={profile.verifiedFields.includes("engagement_rate")} />
            <PlatformPricing platforms={profile.platforms} startingPrice={profile.startingPriceXaf} />
            <ContractTerms minimumBooking={profile.minimumBooking.label} terms={profile.terms} />
          </div>
        </div>
      </div>
    </div>
  );
}
