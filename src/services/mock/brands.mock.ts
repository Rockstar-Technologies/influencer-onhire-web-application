import type { ForBrandsContent } from "@/types/brand";

export const MOCK_FOR_BRANDS_CONTENT: ForBrandsContent = {
  hero: {
    eyebrow: "For Brands",
    title: "Hire the Right Creators. Pay Only for Results.",
    body: "Reach real, engaged audiences across Cameroon. Post a campaign, get matched with verified influencers in your niche and city, and keep your money safe in escrow until the work is delivered.",
    benefits: [
      "Every creator is reviewed and verified by our team",
      "Smart matching by niche, city and engagement rate",
      "Pay with MTN MoMo or Orange Money — held in escrow",
      "No agencies, no hidden fees, no chasing invoices",
    ],
  },
  stats: [
    { value: "300+", label: "Verified creators" },
    { value: "9", label: "Content niches" },
    { value: "7", label: "Cities covered" },
    { value: "100%", label: "Escrow-protected payments" },
  ],
  features: [
    {
      id: "matching",
      icon: "target",
      title: "Smart matching",
      description: "We filter creators by niche, audience location and engagement, then rank the best fits for your brief.",
    },
    {
      id: "verified",
      icon: "badge",
      title: "Verified creators only",
      description: "Profiles, follower counts and past work are checked by our team before any creator goes live.",
    },
    {
      id: "escrow",
      icon: "shield",
      title: "Escrow protection",
      description: "Your budget is held securely and only released after the creator delivers and requests payout.",
    },
    {
      id: "mobile-money",
      icon: "wallet",
      title: "Local payments",
      description: "Fund campaigns in FCFA with MTN MoMo or Orange Money — no card or foreign account needed.",
    },
    {
      id: "direct",
      icon: "chat",
      title: "Work directly",
      description: "Creators accept or decline your request themselves. If one declines, we suggest others automatically.",
    },
    {
      id: "results",
      icon: "chart",
      title: "Track every campaign",
      description: "Follow each campaign from Pending Review to In Progress and see exactly where your money is.",
    },
  ],
  steps: [
    { id: "post", title: "Post your campaign", description: "Share your goal, budget, dates and deliverables in a short brief." },
    { id: "match", title: "Get matched", description: "We send it to verified creators whose niche and audience fit your brand." },
    { id: "fund", title: "Fund into escrow", description: "Pay with mobile money once a creator accepts. Funds stay on hold." },
    { id: "release", title: "Approve & release", description: "The creator delivers, requests payout, and the money is released." },
  ],
  faqs: [
    {
      question: "How much does it cost to post a campaign?",
      answer: "Posting is free. You only pay the budget you agree with a creator, funded into escrow once they accept.",
    },
    {
      question: "What if the creator doesn't deliver?",
      answer: "Your money stays in escrow until the deliverables are done. Funds are never released without a completed payout request.",
    },
    {
      question: "Can I choose creators in a specific city?",
      answer: "Yes. Target one or more cities — if there aren't enough matches in your first choice, we widen the search to nearby markets.",
    },
    {
      question: "How quickly will creators respond?",
      answer: "Matching creators are notified as soon as your campaign is posted, and you're alerted the moment one accepts.",
    },
  ],
};
