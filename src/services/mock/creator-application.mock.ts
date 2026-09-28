import type {
  CreatorApplication,
  CreatorApplicationDraft,
  CreatorApplicationOptions,
  ForCreatorsContent,
} from "@/types/creator-application";

export const MOCK_FOR_CREATORS_CONTENT: ForCreatorsContent = {
  hero: {
    eyebrow: "For Creators",
    title: "Turn Your Following Into Income",
    body: "Join Influencer On Hire and get discovered by brands looking for creators just like you. Set your own price, choose your niche, and get paid securely.",
    benefits: [
      "Get a verified creator profile brands can trust",
      "Set your own pricing and availability",
      "Get paid safely via MTN MoMo or Orange Money",
      "Every application is reviewed by our team before going live",
    ],
  },
  steps: [
    { id: "apply", title: "Apply", description: "Three short steps: who you are, your audience, and your rates." },
    { id: "verify", title: "Get verified", description: "Our team reviews your profile and publishes it once approved." },
    { id: "requests", title: "Receive requests", description: "Brands' campaigns that match you land in your dashboard — accept or decline." },
    { id: "paid", title: "Deliver & get paid", description: "Funds wait in escrow; request payout when done and withdraw to mobile money." },
  ],
  faqs: [
    {
      question: "Do I need a large following to join?",
      answer: "No. You need at least 1,000 followers across your platforms. Brands often prefer smaller creators with an engaged local audience.",
    },
    {
      question: "How do I get paid?",
      answer: "Brands fund every campaign into escrow before you start. Once you deliver and request payout, the money is released and you withdraw it to MTN MoMo or Orange Money.",
    },
    {
      question: "Can I turn down campaigns?",
      answer: "Yes. You choose which requests to accept. If you decline, the brand gets a polite auto-message and we suggest other creators.",
    },
    {
      question: "What happens after I apply?",
      answer: "Our team reviews your application and contacts you on the mobile number you provide. Once approved, your profile goes live and brands can find you.",
    },
  ],
};

export const MOCK_CREATOR_APPLICATION_OPTIONS: CreatorApplicationOptions = {
  niches: ["Beauty", "Fashion", "Lifestyle", "Sports & Fitness", "Food", "Tech", "Travel", "Music", "Comedy"],
  cities: ["Douala", "Yaoundé", "Bamenda", "Buea", "Bafoussam", "Garoua", "Kribi"],
  platforms: [
    { id: "facebook", label: "Facebook" },
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "youtube", label: "YouTube" },
  ],
  brandFit: [
    "Beauty & Skincare",
    "Fashion & Apparel",
    "Sports Apparel & Footwear",
    "Fitness Supplements",
    "Food & Drinks",
    "Energy Drinks",
    "Tech & Wearables",
    "Telecom & Mobile Money",
    "Automotive",
    "Travel & Hospitality",
  ],
  minimumBooking: ["1 week", "2 weeks", "1 month"],
  revisions: ["1 round of content revisions", "2 rounds of content revisions", "3 rounds of content revisions"],
  usageRights: ["Content usage rights: 3 months", "Content usage rights: 6 months", "Content usage rights: 12 months"],
  depositTerms: ["50% deposit, balance on delivery", "Full amount held in escrow until delivery"],
  defaultDeliverables: "1 dedicated post + 3 stories per platform",
  minFollowers: 1000,
  minPricePerPlatform: 5000,
  maxCollaborations: 3,
};

export const MOCK_CREATOR_APPLICATIONS: CreatorApplication[] = [];

// The in-progress application, filled in one step at a time.
export const MOCK_CREATOR_APPLICATION_DRAFT: CreatorApplicationDraft = {};
