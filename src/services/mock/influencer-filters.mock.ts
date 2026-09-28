import type { InfluencerSearchOptions } from "@/types/influencer-filters";

export const MOCK_SEARCH_OPTIONS: InfluencerSearchOptions = {
  sortOptions: [
    { value: "recommended", label: "Recommended" },
    { value: "top-rated", label: "Top rated" },
    { value: "newest", label: "Newest" },
    { value: "engagement", label: "Highest engagement" },
    { value: "price-asc", label: "Price: low to high" },
    { value: "price-desc", label: "Price: high to low" },
  ],
  filterGroups: [
    {
      key: "niche",
      label: "Niche",
      mode: "multiple",
      options: [
        { value: "fashion", label: "Fashion" },
        { value: "fitness", label: "Fitness" },
        { value: "business", label: "Business" },
        { value: "beauty", label: "Beauty" },
        { value: "music", label: "Music" },
        { value: "sports", label: "Sports" },
      ],
    },
    {
      key: "location",
      label: "Location",
      mode: "multiple",
      options: [
        { value: "douala", label: "Douala" },
        { value: "yaounde", label: "Yaoundé" },
        { value: "bamenda", label: "Bamenda" },
        { value: "buea", label: "Buea" },
      ],
    },
    {
      key: "platform",
      label: "Platform",
      mode: "multiple",
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "tiktok", label: "TikTok" },
        { value: "facebook", label: "Facebook" },
        { value: "youtube", label: "YouTube" },
      ],
    },
    {
      key: "followers",
      label: "Followers",
      mode: "single",
      options: [
        { value: "0-50k", label: "Under 50K" },
        { value: "50k-200k", label: "50K – 200K" },
        { value: "200k-1m", label: "200K – 1M" },
        { value: "1m+", label: "1M+" },
      ],
    },
    {
      key: "budget",
      label: "Budget (starting price)",
      mode: "single",
      options: [
        { value: "0-500000", label: "Under 500,000 CFA" },
        { value: "500000-1000000", label: "500,000 – 1,000,000 CFA" },
        { value: "1000000+", label: "1,000,000+ CFA" },
      ],
    },
    {
      key: "language",
      label: "Language",
      mode: "multiple",
      options: [
        { value: "english", label: "English" },
        { value: "french", label: "French" },
        { value: "bilingual", label: "Bilingual" },
      ],
    },
    {
      key: "success-rate",
      label: "Success rate",
      mode: "single",
      options: [
        { value: "90", label: "90%+" },
        { value: "75", label: "75%+" },
      ],
    },
  ],
};
