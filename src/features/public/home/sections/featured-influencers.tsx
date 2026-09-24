import Image from "next/image";
import { FaFacebook, FaInstagram, FaStar, FaStarHalfStroke, FaTiktok, FaYoutube } from "react-icons/fa6";
import { FiGlobe } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import { SectionHeading } from "@/components/shared/section-heading";
import { getFeaturedInfluencers } from "@/services/influencers.service";
import type { Influencer } from "@/types/influencer";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-star" aria-hidden>
      {Array.from({ length: full }, (_, i) => (
        <FaStar key={i} size={11} />
      ))}
      {half && <FaStarHalfStroke size={11} />}
    </span>
  );
}

function SocialStat({ Icon, color, value }: { Icon: typeof FaFacebook; color: string; value: string }) {
  return (
    <span className="flex items-center gap-2 text-xs font-semibold text-heading">
      <Icon size={16} style={{ color }} />
      {value}
    </span>
  );
}

function InfluencerCard({ influencer }: { influencer: Influencer }) {
  const { name, niche, imageUrl, language, rating, activity, social, startingPrice } = influencer;

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
        <p className="mt-1 text-xs text-muted">{niche}</p>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success-light px-2.5 py-1 text-[11px] font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {activity}
        </span>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
          <SocialStat Icon={FaFacebook} color="#1877f2" value={social.facebook} />
          <SocialStat Icon={FaInstagram} color="#e4405f" value={social.instagram} />
          <SocialStat Icon={FaTiktok} color="#000000" value={social.tiktok} />
          <SocialStat Icon={FaYoutube} color="#ff0000" value={social.youtube} />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Starting at</span>
          <span className="text-sm font-bold text-heading">From {startingPrice.toLocaleString("en-US")} Frs</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button href="/coming-soon?title=Hire+Influencer" className="rounded-lg py-2.5">
            Hire
          </Button>
          <Button href="/coming-soon?title=Influencer+Details" variant="outline" className="rounded-lg py-2.5">
            Details
          </Button>
        </div>
      </div>
    </article>
  );
}

export async function FeaturedInfluencers() {
  const influencers = await getFeaturedInfluencers();

  return (
    <section className="bg-surface px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Featured"
        title="Featured Influencers"
        description="Hand-picked creators with proven reach and results across Cameroon."
      />
      <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {influencers.map((influencer) => (
          <InfluencerCard key={influencer.id} influencer={influencer} />
        ))}
      </div>
    </section>
  );
}
