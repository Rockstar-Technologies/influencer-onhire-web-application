export type InfluencerLanguage = "Bilingual" | "French" | "English";

export interface SocialStats {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
}

export interface Influencer {
  id: string;
  name: string;
  niche: string;
  imageUrl: string;
  language: InfluencerLanguage;
  rating: number;
  activity: string;
  social: SocialStats;
  startingPrice: number;
}
