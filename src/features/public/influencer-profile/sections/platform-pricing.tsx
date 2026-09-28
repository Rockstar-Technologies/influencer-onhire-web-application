import { CollapsiblePanel } from "@/components/shared/collapsible-panel";
import { PLATFORM_META, PLATFORMS } from "@/components/shared/social-stats";
import { formatPrice } from "@/lib/utils";
import type { InfluencerProfile } from "@/types/influencer";

interface PlatformPricingProps {
  pricing: InfluencerProfile["platformPricing"];
  startingPrice: number;
}

export function PlatformPricing({ pricing, startingPrice }: PlatformPricingProps) {
  // Only platforms the influencer has a price for, in the standard platform order.
  const rows = PLATFORMS.flatMap((platform) => {
    const price = pricing[platform];
    return price === undefined ? [] : [{ platform, price, ...PLATFORM_META[platform] }];
  });

  return (
    <CollapsiblePanel title="Platform Pricing" summary={`From ${formatPrice(startingPrice)}`}>
      <ul className="space-y-2">
        {rows.map(({ platform, price, Icon, color, priceLabel }) => (
          <li key={platform} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="flex items-center gap-2.5 text-sm font-medium text-heading">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: color }}
              >
                <Icon size={13} />
              </span>
              {priceLabel}
            </span>
            <span className="text-sm font-bold text-heading">{formatPrice(price)}</span>
          </li>
        ))}
      </ul>
    </CollapsiblePanel>
  );
}
