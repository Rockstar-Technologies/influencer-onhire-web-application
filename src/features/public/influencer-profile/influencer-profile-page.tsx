import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { getInfluencerProfile } from "@/services/influencers.service";
import { About } from "./sections/about";
import { BrandFit } from "./sections/brand-fit";
import { ContentStyle } from "./sections/content-style";
import { ContractTerms } from "./sections/contract-terms";
import { EngagementRate } from "./sections/engagement-rate";
import { PastCollaborations } from "./sections/past-collaborations";
import { PaymentMethods } from "./sections/payment-methods";
import { PlatformPricing } from "./sections/platform-pricing";
import { ProfileHeader } from "./sections/profile-header";

// Fetches the profile once and hands each section only the fields it shows.
export async function InfluencerProfilePage({ username }: { username: string }) {
  const profile = await getInfluencerProfile(username);
  if (!profile) notFound();

  const firstName = profile.name.split(" ")[0];

  return (
    <div className="bg-surface px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/influencers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
        >
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
            <EngagementRate engagementRate={profile.engagementRate} />
            <PlatformPricing pricing={profile.platformPricing} startingPrice={profile.startingPrice} />
            <ContractTerms minimumBooking={profile.minimumBooking} terms={profile.contractTerms} />
            <PaymentMethods methods={profile.paymentMethods} />
          </div>
        </div>
      </div>
    </div>
  );
}
