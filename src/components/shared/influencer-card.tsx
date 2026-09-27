import Image from "next/image";
import { FiGlobe, FiMapPin } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import { SocialStatList } from "@/components/shared/social-stats";
import { Stars } from "@/components/shared/stars";
import { formatPrice } from "@/lib/utils";
import type { Influencer } from "@/types/influencer";

export function InfluencerCard({ influencer }: { influencer: Influencer }) {
  const { username, name, niche, location, imageUrl, language, rating, activity, social, startingPrice } = influencer;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="relative h-64 w-full bg-surface-alt">
        <Image src={imageUrl} alt={name} fill sizes="(min-width: 1024px) 360px, 100vw" className="object-cover" />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-heading shadow-sm">
          {language === "Bilingual" ? (
            <FiGlobe className="text-sky-500" size={12} />
          ) : (
            <span className="text-[9px] font-bold text-muted">{language === "French" ? "FR" : "GB"}</span>
          )}
          {language}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-heading">{name}</h3>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-body">
            <Stars rating={rating} />
            {rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          {niche}
          <span aria-hidden>·</span>
          <FiMapPin size={11} />
          {location}
        </p>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success-light px-2.5 py-1 text-[11px] font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {activity}
        </span>

        <SocialStatList social={social} className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3" />

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Starting at</span>
          <span className="text-sm font-bold text-heading">From {formatPrice(startingPrice)}</span>
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
