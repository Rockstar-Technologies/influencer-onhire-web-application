import { FiMapPin } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import { CreatorAvatar } from "@/components/shared/creator-avatar";
import { socialFrom } from "@/components/shared/influencer-card";
import { SocialStatList } from "@/components/shared/social-stats";
import { Stars } from "@/components/shared/stars";
import type { PublicProfile } from "@/lib/api/schemas";
import { LANGUAGE_LABELS } from "@/lib/domain/labels";

export function ProfileHeader({ profile, firstName }: { profile: PublicProfile; firstName: string }) {
  const { displayName, primaryNiche, niches, city, language, metrics, platforms } = profile;
  const nicheName = niches.find((n) => n.slug === primaryNiche)?.name ?? niches[0]?.name ?? "Creator";
  const social = socialFrom({ followers: { total: profile.followers.total, platforms: platforms.map((p) => ({ platform: p.platform, followers: p.followers })) } });

  return (
    <section className="mt-6 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:flex-row sm:items-start sm:p-8">
      <CreatorAvatar name={displayName} className="h-24 w-24 text-2xl sm:h-28 sm:w-28" />

      <div className="flex-1">
        <h1 className="text-2xl font-bold text-heading">{displayName}</h1>

        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {nicheName}
          <span aria-hidden>·</span>
          <FiMapPin size={12} aria-hidden />
          {city.name}
          {language && (
            <>
              <span aria-hidden>·</span>
              {LANGUAGE_LABELS[language]}
            </>
          )}
        </p>

        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-body">
          {metrics.rating ? (
            <span className="flex items-center gap-1.5">
              <Stars rating={metrics.rating.average} size={12} />
              <span className="font-semibold">{metrics.rating.average.toFixed(1)}</span>
              <span className="text-muted">({metrics.rating.count} {metrics.rating.count === 1 ? "review" : "reviews"})</span>
            </span>
          ) : (
            <span className="text-muted">No reviews yet</span>
          )}
          {metrics.successRatePct !== null && <span>{Math.round(metrics.successRatePct)}% success rate</span>}
        </p>

        <SocialStatList social={social} size={14} className="mt-3 flex flex-wrap gap-x-5 gap-y-2" />
      </div>

      <Button href={`/influencers/${profile.username}/hire`} className="shrink-0 self-start rounded-lg px-5 py-2.5">
        Hire {firstName}
      </Button>
    </section>
  );
}
