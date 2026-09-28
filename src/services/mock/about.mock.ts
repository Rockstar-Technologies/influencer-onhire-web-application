import type { AboutContent } from "@/types/about";

export const MOCK_ABOUT_CONTENT: AboutContent = {
  intro: {
    eyebrow: "About Us",
    title: "Connecting Cameroonian brands with the creators",
    highlight: "their customers already follow",
    body: "Influencer On Hire is a marketplace where businesses find, hire and pay local influencers — and where creators turn their following into steady, secure income.",
  },
  facts: [
    { value: "100%", label: "of campaign payments held in escrow" },
    { value: "2", label: "mobile money options — MTN MoMo & Orange Money" },
    { value: "24h", label: "typical time to receive a withdrawal" },
    { value: "0 FCFA", label: "charged until an influencer accepts your campaign" },
  ],
  story: {
    title: "Why we built Influencer On Hire",
    paragraphs: [
      "Across Douala, Yaoundé and beyond, small businesses want to reach customers through the voices people already trust online. But finding the right creator usually means endless DMs, unclear prices and paying upfront with no guarantee the work gets done.",
      "Creators face the opposite problem: great audiences, but late payments, one-off deals and no simple way to show brands what they offer.",
      "We built one place that fixes both — clear briefs, fair matching, and payments that are protected for everyone until the campaign is delivered.",
    ],
    mission:
      "Our mission is to make influencer marketing in Cameroon simple, fair and safe — for the brands that pay and the creators who deliver.",
  },
  guides: [
    {
      id: "brands",
      eyebrow: "For Brands",
      title: "Launch a campaign in minutes",
      steps: [
        "Post a campaign brief with your budget, dates and deliverables.",
        "We match it to verified creators by niche, city and engagement.",
        "Fund the campaign into escrow — it's only released once the work is delivered.",
      ],
      cta: { label: "Post a Campaign", href: "/campaigns/new" },
    },
    {
      id: "creators",
      eyebrow: "For Creators",
      title: "Get paid for what you already do",
      steps: [
        "Create a creator profile — our team reviews it before it goes live.",
        "Accept the campaign requests that fit your audience and schedule.",
        "Deliver, request payout, and withdraw to MTN MoMo or Orange Money.",
      ],
      cta: { label: "Explore For Creators", href: "/for-creators" },
    },
  ],
  values: [
    {
      id: "trust",
      title: "Protected payments",
      description: "Brands fund into escrow and creators are paid on delivery, so nobody carries the risk alone.",
    },
    {
      id: "local",
      title: "Built for Cameroon",
      description: "Prices in FCFA, mobile money payouts, and matching by the cities your customers live in.",
    },
    {
      id: "fair",
      title: "Fair for creators",
      description: "Creators set their own prices and choose which campaigns to accept — no pressure, no hidden cuts.",
    },
    {
      id: "human",
      title: "Real people reviewing",
      description: "Every creator application and payout request is checked by our team before it goes through.",
    },
  ],
  closing: {
    title: "Ready to work together?",
    body: "Whether you're a brand with a product to launch or a creator with an audience that listens, there's a place for you here.",
    primary: { label: "Post a Campaign", href: "/campaigns/new" },
    secondary: { label: "Become a Creator", href: "/for-creators/apply/profile" },
  },
};
