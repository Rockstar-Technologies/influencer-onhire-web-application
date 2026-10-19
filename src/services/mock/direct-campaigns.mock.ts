import type { Campaign, CampaignFormOptions, CampaignGuidance } from "@/types/direct-campaign";
import type { FilterOption } from "@/types/influencer-filters";
import { MOCK_SEARCH_OPTIONS } from "./influencer-filters.mock";

// Niches and cities come from the browse filters so a campaign can be matched against the same values.
function optionsOf(groupKey: string): FilterOption[] {
  return MOCK_SEARCH_OPTIONS.filterGroups.find((group) => group.key === groupKey)?.options ?? [];
}

export const MOCK_CAMPAIGN_FORM_OPTIONS: CampaignFormOptions = {
  niches: optionsOf("niche"),
  locations: optionsOf("location"),
  ageRanges: [
    { value: "18-24", label: "18–24" },
    { value: "25-34", label: "25–34" },
    { value: "35-44", label: "35–44" },
    { value: "45-plus", label: "45+" },
  ],
  interests: [
    { value: "beauty-skincare", label: "Beauty & skincare" },
    { value: "fashion", label: "Fashion" },
    { value: "fitness-health", label: "Fitness & health" },
    { value: "food-travel", label: "Food & travel" },
    { value: "tech", label: "Tech" },
    { value: "music-entertainment", label: "Music & entertainment" },
    { value: "business", label: "Business" },
  ],
  engagementLevels: [
    { value: "any", label: "No minimum" },
    { value: "3", label: "3%+" },
    { value: "5", label: "5%+" },
    { value: "7", label: "7%+" },
  ],
};

export const MOCK_CAMPAIGN_GUIDANCE: CampaignGuidance = {
  lifecycle: [
    { label: "Pending Review", tone: "warning" },
    { label: "Accepted", tone: "primary" },
    { label: "In Progress", tone: "success" },
  ],
  lifecycleNote:
    "Only active influencers with no conflicting brand deals see your campaign. They can accept or decline directly — if declined, we'll suggest other matching influencers automatically.",
  smartMatching: [
    "Filters influencers by your niche",
    "Cross-checks their audience against your target age, location & interests",
    "Ranks matches by engagement rate & past results",
    "Only notifies influencers who are active and free of conflicting deals",
  ],
  securePoints: [
    "Payment held in escrow until delivery is confirmed",
    "Funds only released after the influencer's payout request",
    "Leave a rating & review once the campaign is complete",
  ],
  faqs: [
    {
      question: "What happens after I submit?",
      answer:
        "Your campaign goes to our team for a quick review, then it's sent to matching influencers. You're notified the moment one accepts.",
    },
    {
      question: "Can I edit my campaign after posting?",
      answer:
        "Yes, until an influencer accepts it. Once someone accepts, the brief is locked so both sides work from the same terms.",
    },
    {
      question: "What if no influencer accepts?",
      answer:
        "You aren't charged. We'll suggest other matching influencers, and you can widen your budget or audience and re-post.",
    },
  ],
};

// In-memory stand-in for the campaigns table. Resets whenever the dev server restarts.
export const MOCK_CAMPAIGNS: Campaign[] = [];
