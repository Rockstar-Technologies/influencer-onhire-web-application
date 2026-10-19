import type {
  Campaign,
  CampaignOverview,
  CampaignPreview,
  EngagementRateOption,
  MatchableInfluencer,
} from "@/types/campaign";

export const MOCK_CAMPAIGN_OVERVIEW: CampaignOverview = {
  influencerReach: "1.2m",
  steps: [
    {
      id: "targeting",
      title: "Set Targeting",
      description:
        "Specify demographics including niche, location and following size of the influencers you want to target.",
    },
    {
      id: "post",
      title: "Post Campaign",
      description:
        "Centralize your images, requirements, and more in a campaign brief sent to 1.2m influencers.",
    },
    {
      id: "apply",
      title: "Influencers Apply",
      description:
        "Targeted influencers submit their pricing, and you choose who to collaborate with.",
    },
  ],
};

export const MOCK_CAMPAIGN_PREVIEW: CampaignPreview = {
  creators: [
    { id: "1", name: "Amara N.", platform: "TikTok", price: 800 },
    { id: "2", name: "Kevin T.", platform: "Instagram", price: 600 },
    { id: "3", name: "Brenda M.", platform: "Instagram", price: 450 },
    { id: "4", name: "Joel & Lisa", platform: "YouTube", price: 900 },
    { id: "5", name: "Sandra E.", platform: "TikTok", price: 350 },
    { id: "6", name: "Paul K.", platform: "Instagram", price: 500 },
    { id: "7", name: "Grace A.", platform: "TikTok", price: 400 },
    { id: "8", name: "Nadia F.", platform: "Instagram", price: 550 },
  ],
  featured: {
    name: "Irving De Jong",
    niches: ["Lifestyle", "Fashion", "Content creator", "artist", "photography", "Travel"],
    packages: [{ name: "Instagram stories", price: 250 }],
  },
};

export const MOCK_CAMPAIGNS: Campaign[] = [];


export const MOCK_ENGAGEMENT_RATE_OPTIONS: EngagementRateOption[] = [
  { value: 0, label: "Any" },
  { value: 1, label: "1%+" },
  { value: 2, label: "2%+" },
  { value: 3, label: "3%+" },
  { value: 5, label: "5%+" },
  { value: 8, label: "8%+" },
];


const NICHES = ["Beauty", "Fashion", "Lifestyle", "Food", "Tech", "Travel", "Music", "Comedy", "Fitness"];
const FIRST_NAMES = ["Lindiwe", "Amara", "Muriel", "Brenda", "Kevin", "Sandra", "Joel", "Grace", "Nadia", "Paul", "Aïcha", "Boris", "Carine", "Estelle", "Franck", "Gaëlle", "Hervé"];
const LAST_NAMES = ["Osei", "Kilonzo", "Blanch", "Mbah", "Tabi", "Eyong", "Ngono", "Fouda", "Ateba", "Nkeng", "Tchoua", "Manga", "Essomba"];
// Douala and Yaoundé repeat so the pool leans toward the two biggest markets.
const CITIES = ["Douala", "Yaoundé", "Douala", "Bamenda", "Yaoundé", "Buea", "Douala", "Yaoundé", "Bafoussam", "Garoua", "Kribi"];

// Deterministic pool of creators the matching step filters against.
export const MOCK_MATCHABLE_INFLUENCERS: MatchableInfluencer[] = Array.from({ length: 360 }, (_, i) => ({
  id: `inf-${i + 1}`,
  name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`,
  niche: NICHES[i % NICHES.length],
  city: CITIES[(i * 7) % CITIES.length],
  engagementRate: Math.round((((i * 141 + 11) % 97) / 10 + 0.5) * 10) / 10,
  verified: i % 6 !== 5,
  active: i % 7 !== 3,
  hasConflictingDeal: i % 11 === 4,
}));
