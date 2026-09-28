import Image from "next/image";
import { SocialStatList } from "@/components/shared/social-stats";
import { formatPrice } from "@/lib/utils";
import type { InfluencerProfile } from "@/types/influencer";

export function InfluencerSummary({ profile }: { profile: InfluencerProfile }) {
  const { name, niche, location, imageUrl, social, startingPrice, minimumBooking } = profile;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-alt">
        <Image src={imageUrl} alt={name} fill sizes="80px" className="object-cover" priority />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-heading">
          <span className="sr-only">Hire </span>
          {name}
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          {niche} · {location}
        </p>
        <SocialStatList social={social} size={13} className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5" />
        <p className="mt-2 text-xs text-muted">
          From <span className="font-semibold text-primary">{formatPrice(startingPrice)}</span> · Min. booking{" "}
          {minimumBooking}
        </p>
      </div>
    </div>
  );
}
