export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "youtube";

// Follower counts per platform; 0 means the creator isn't on that platform.
export type SocialStats = Record<SocialPlatform, number>;
