import type { Influencer } from "@/types/influencer";

export const MOCK_INFLUENCERS: Influencer[] = [
  {
    id: "1",
    name: "Francis Ngannou",
    niche: "Sports & Fitness",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    language: "Bilingual",
    rating: 4.9,
    activity: "Active this week",
    social: { facebook: "1.2M", instagram: "8.4M", tiktok: "3.1M", youtube: "620K" },
    startingPrice: 2000000,
  },
  {
    id: "2",
    name: "Muriel Blanch",
    niche: "Fashion & Lifestyle",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    language: "French",
    rating: 4.7,
    activity: "Active today",
    social: { facebook: "210K", instagram: "1.5M", tiktok: "890K", youtube: "95K" },
    startingPrice: 850000,
  },
  {
    id: "3",
    name: "Samuel Etoo",
    niche: "Business & Lifestyle",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    language: "Bilingual",
    rating: 4.5,
    activity: "Active 3 days ago",
    social: { facebook: "85K", instagram: "320K", tiktok: "150K", youtube: "40K" },
    startingPrice: 450000,
  },
];
