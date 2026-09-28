import type { IconType } from "react-icons";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import { formatCount } from "@/lib/utils";
import type { SocialPlatform, SocialStats } from "@/types/influencer";

export const PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "tiktok", "youtube"];

export const PLATFORM_META: Record<SocialPlatform, { Icon: IconType; color: string; priceLabel: string }> = {
  facebook: { Icon: FaFacebook, color: "#1877f2", priceLabel: "Facebook post" },
  instagram: { Icon: FaInstagram, color: "#e4405f", priceLabel: "Instagram post" },
  tiktok: { Icon: FaTiktok, color: "#000000", priceLabel: "TikTok video" },
  youtube: { Icon: FaYoutube, color: "#ff0000", priceLabel: "YouTube video" },
};

export function SocialStat({ platform, value, size = 16 }: { platform: SocialPlatform; value: number; size?: number }) {
  const { Icon, color } = PLATFORM_META[platform];
  return (
    <span className="flex items-center gap-2 text-xs font-semibold text-heading">
      <Icon size={size} style={{ color }} aria-label={platform} />
      {formatCount(value)}
    </span>
  );
}

// `className` replaces the default layout (cn() doesn't merge conflicting utilities).
export function SocialStatList({ social, size, className }: { social: SocialStats; size?: number; className?: string }) {
  return (
    <div className={className ?? "flex flex-wrap gap-x-5 gap-y-2"}>
      {PLATFORMS.map((platform) => (
        <SocialStat key={platform} platform={platform} value={social[platform]} size={size} />
      ))}
    </div>
  );
}
