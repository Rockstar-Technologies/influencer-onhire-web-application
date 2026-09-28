import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { getCampaignDurations } from "@/services/hire-requests.service";
import { getInfluencerProfile } from "@/services/influencers.service";
import { HireForm } from "./sections/hire-form";
import { InfluencerSummary } from "./sections/influencer-summary";

const PREFERRED_DEFAULT_DURATION = "1-month";

export async function HirePage({ username }: { username: string }) {
  const profile = await getInfluencerProfile(username);
  if (!profile) notFound();

  const durations = await getCampaignDurations(profile.minimumBooking);
  const defaultDuration = durations.some((duration) => duration.value === PREFERRED_DEFAULT_DURATION)
    ? PREFERRED_DEFAULT_DURATION
    : durations[0].value;
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="bg-surface px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/influencers/${username}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
        >
          <FiArrowLeft />
          Back to {firstName}&apos;s profile
        </Link>

        <div className="mx-auto mt-6 max-w-xl">
          <HireForm
            username={username}
            firstName={firstName}
            paymentMethods={profile.paymentMethods}
            durations={durations}
            defaultDuration={defaultDuration}
            minimumBooking={profile.minimumBooking}
            header={<InfluencerSummary profile={profile} />}
          />
        </div>
      </div>
    </div>
  );
}
