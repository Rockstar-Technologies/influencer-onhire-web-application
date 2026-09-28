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
  // Lowest of the influencer's platform prices, in CFA.
  startingPrice: number;
}

export interface Collaboration {
  brand: string;
  campaign: string;
  year: number;
}

// Everything the detail page shows on top of the card data.
export interface InfluencerProfile extends Influencer {
  bio: string;
  contentStyle: string;
  brandFit: string[];
  collaborations: Collaboration[];
  // Price per platform in CFA. Platforms the influencer isn't on are left out.
  platformPricing: Partial<Record<SocialPlatform, number>>;
  minimumBooking: string;
  contractTerms: string[];
  paymentMethods: string[];
}

export type InfluencerProfileDetails = Omit<InfluencerProfile, keyof Influencer>;
