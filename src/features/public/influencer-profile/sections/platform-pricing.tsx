import { CollapsiblePanel } from "@/components/shared/collapsible-panel";
import { PLATFORM_META } from "@/components/shared/social-stats";
import type { PublicProfile } from "@/lib/api/schemas";
import { formatCount, formatPrice } from "@/lib/utils";

/** The creator's rate per platform (what a hire request on that platform costs), with their handle and follower count. */
export function PlatformPricing({ platforms, startingPrice }: { platforms: PublicProfile["platforms"]; startingPrice: number }) {
  return (
    <CollapsiblePanel title="Platform Pricing" summary={`From ${formatPrice(startingPrice)}`}>
      <ul className="space-y-2">
        {platforms.map(({ platform, handle, followers, priceXaf }) => {
          const { Icon, color, priceLabel } = PLATFORM_META[platform];
          return (
            <li key={platform} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-heading">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: color }}>
                  <Icon size={13} />
                </span>
                <span className="min-w-0">
                  {priceLabel}
                  <span className="block truncate text-xs font-normal text-muted">
                    {handle} · {formatCount(followers)} followers
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-heading">{formatPrice(priceXaf)}</span>
            </li>
          );
        })}
      </ul>
    </CollapsiblePanel>
  );
}
