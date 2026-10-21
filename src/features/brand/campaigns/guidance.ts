export interface CampaignLifecycleStep {
  label: string;
  tone: "warning" | "primary" | "success";
}

export interface CampaignFaq {
  question: string;
  answer: string;
}

/** Static help shown next to the campaign form. Every statement describes what the platform actually does (backend docs/CAMPAIGN_MANAGEMENT.md, PLATFORM_INVITATIONS.md). */
export interface CampaignGuidance {
  lifecycle: CampaignLifecycleStep[];
  lifecycleNote: string;
  smartMatching: string[];
  securePoints: string[];
  faqs: CampaignFaq[];
}

export const CAMPAIGN_GUIDANCE: CampaignGuidance = {
  lifecycle: [
    { label: "Draft", tone: "primary" },
    { label: "Pending Review", tone: "warning" },
    { label: "Open", tone: "success" },
  ],
  lifecycleNote:
    "A draft is private to you and can be edited or deleted. After you submit it, our team reviews it. Once it is approved it opens, and matching active creators can respond.",
  smartMatching: [
    "Invites active creators in your niche",
    "Only creators in your chosen cities (or everyone, if you choose none)",
    "Only creators who meet your minimum engagement rate",
    "Only creators whose price is within your maximum budget and who still have capacity for your dates",
    "Age ranges and interests are saved with your campaign for creators to read, but are not used to pick creators",
  ],
  securePoints: [
    "Payment is held in escrow until delivery is confirmed",
    "Nothing is charged until a creator accepts and you place the funds in escrow",
    "Your maximum budget is the most you will pay one creator",
  ],
  faqs: [
    {
      question: "What happens after I submit?",
      answer: "Your campaign goes to our team for review. You can follow its status under My campaigns; if it is not approved, the reviewer's note is shown there.",
    },
    {
      question: "Can I edit my campaign after submitting?",
      answer: "No. Only a draft can be edited. A submitted campaign can be withdrawn (cancelled) and you can post a new one.",
    },
    {
      question: "Can I attach reference images?",
      answer: "Not yet. Image upload isn't available, so campaigns are saved without images for now.",
    },
  ],
};
