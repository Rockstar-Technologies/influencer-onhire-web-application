import type { CampaignOverview, CampaignPreview } from "@/types/campaign";

export const MOCK_CAMPAIGN_OVERVIEW: CampaignOverview = {
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
        "Centralize your images, requirements, and more in a campaign brief sent to the influencers it matches.",
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
