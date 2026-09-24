import Image from "next/image";
import { Button } from "@/components/shared/button";
import { SocialStatList } from "@/components/shared/social-stats";
import { Stars } from "@/components/shared/stars";
import type { InfluencerProfile } from "@/types/influencer";

export function ProfileHeader({ profile, firstName }: { profile: InfluencerProfile; firstName: string }) {
  const { name, niche, location, imageUrl, rating, activity, social } = profile;

  return (
    <section className="mt-6 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:flex-row sm:items-start sm:p-8">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-surface-alt sm:h-28 sm:w-28">
        <Image src={imageUrl} alt={name} fill sizes="112px" className="object-cover" priority />
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-heading">{name}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {activity}
          </span>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {niche}
          <span aria-hidden>·</span>
          {location}
          <span aria-hidden>·</span>
          <Stars rating={rating} size={12} />
          <span className="font-semibold text-body">{rating.toFixed(1)}</span>
        </p>

        <SocialStatList social={social} size={14} className="mt-3 flex flex-wrap gap-x-5 gap-y-2" />
      </div>

      <Button href="/coming-soon?title=Hire+Influencer" className="shrink-0 self-start rounded-lg px-5 py-2.5">
        Hire {firstName}
      </Button>
    </section>
  );
}
