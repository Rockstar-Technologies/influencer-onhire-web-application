import { FiGlobe, FiMapPin } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import { CreatorAvatar } from "@/components/shared/creator-avatar";
import { SocialStatList } from "@/components/shared/social-stats";
import { Stars } from "@/components/shared/stars";
import type { PublicCard } from "@/lib/api/schemas";
import { LANGUAGE_LABELS } from "@/lib/domain/labels";
import { formatPrice } from "@/lib/utils";
import type { SocialStats } from "@/types/influencer";

/** Follower counts per platform from the API's list (platforms the creator is not on stay at 0). */
export function socialFrom(card: Pick<PublicCard, "followers">): SocialStats {
  const social: SocialStats = { facebook: 0, instagram: 0, tiktok: 0, youtube: 0 };
  for (const entry of card.followers.platforms) social[entry.platform] = entry.followers;
  return social;
}

/** One public creator card. Everything shown is a field the API publishes; a missing figure is left out or stated as missing, never invented. */
export function InfluencerCard({ influencer }: { influencer: PublicCard }) {
  const { username, displayName, primaryNiche, niches, city, language, rating, successRatePct, engagementRatePct, startingPriceXaf } = influencer;
  const nicheName = niches.find((n) => n.slug === primaryNiche)?.name ?? niches[0]?.name ?? "Creator";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <CreatorAvatar name={displayName} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-heading">{displayName}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {nicheName}
              <span aria-hidden>·</span>
              <FiMapPin size={11} aria-hidden />
              {city.name}
            </p>
          </div>
          {language && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-heading">
              {language === "bilingual" && <FiGlobe className="text-sky-500" size={12} aria-hidden />}
              {LANGUAGE_LABELS[language]}
            </span>
          )}
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-body">
          {rating ? (
            <span className="flex items-center gap-1.5">
              <Stars rating={rating.average} />
              {rating.average.toFixed(1)} <span className="font-normal text-muted">({rating.count})</span>
            </span>
          ) : (
            <span className="font-normal text-muted">No reviews yet</span>
          )}
          {successRatePct !== null && <span>{Math.round(successRatePct)}% success</span>}
          {engagementRatePct !== null && <span>{engagementRatePct.toFixed(1)}% engagement</span>}
        </p>

        <SocialStatList social={socialFrom(influencer)} className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3" />

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Starting at</span>
          <span className="text-sm font-bold text-heading">From {formatPrice(startingPriceXaf)}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button href={`/influencers/${username}/hire`} className="rounded-lg py-2.5">
            Hire
          </Button>
          <Button href={`/influencers/${username}`} variant="outline" className="rounded-lg py-2.5">
            Details
          </Button>
        </div>
      </div>
    </article>
  );
}
