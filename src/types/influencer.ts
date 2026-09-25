export type InfluencerLanguage = "Bilingual" | "French" | "English";

export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "youtube";

// Follower counts per platform; 0 means the influencer isn't on that platform.
export type SocialStats = Record<SocialPlatform, number>;

export interface Influencer {
  id: string;
  username: string;
  name: string;
  niche: string;
  categories: string[];
  location: string;
  imageUrl: string;
  language: InfluencerLanguage;
  rating: number;
  successRate: number;
  engagementRate: number;
  activity: string;
  joinedAt: string;
  social: SocialStats;
  startingPrice: number;
}
