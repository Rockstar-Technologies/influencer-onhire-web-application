import Link from "next/link";
import { FiStar } from "react-icons/fi";
import { cn, formatPrice, initials } from "@/lib/utils";
import { getTopInfluencers } from "@/services/dashboard.service";
import { InfluencerQuickActions } from "./influencer-quick-actions";

export async function TopInfluencers() {
  const influencers = await getTopInfluencers();

  return (
    <section aria-labelledby="top-heading" className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="top-heading" className="font-display text-base font-bold text-heading">
          Top Influencers
        </h2>
        <Link href="/admin/users?type=influencer" className="text-sm font-semibold text-navy hover:underline">
          View all
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">Ranked by lifetime earnings.</p>

      <ol className="mt-4 space-y-3">
        {influencers.map((influencer, index) => (
          <li
            key={influencer.id}
            className="group rounded-xl border border-border p-3 transition-all hover:border-navy/25 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                  index === 0 ? "bg-star text-white" : "bg-border-light text-body",
                )}
                aria-label={`Rank ${index + 1}`}
              >
                {index + 1}
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-light text-xs font-bold text-navy">
                {initials(influencer.name)}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/users/${influencer.id}`} className="block truncate font-semibold text-heading hover:text-navy hover:underline">
                  {influencer.name}
                </Link>
                <span className="block text-xs text-muted">{influencer.niche}</span>
              </div>
              <InfluencerQuickActions influencer={influencer} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border-light pt-3 text-xs">
              <div>
                <dt className="text-muted">Earned</dt>
                <dd className="font-semibold text-heading">{formatPrice(influencer.earnings)}</dd>
              </div>
              <div>
                <dt className="text-muted">Rating</dt>
                <dd className="flex items-center gap-1 font-semibold text-heading">
                  <FiStar className="fill-star text-star" aria-hidden />
                  {influencer.rating.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Success</dt>
                <dd className="font-semibold text-heading">{influencer.successRate}%</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
