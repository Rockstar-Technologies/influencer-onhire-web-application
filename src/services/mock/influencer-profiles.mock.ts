import type { InfluencerProfileDetails } from "@/types/influencer";

const STANDARD_TERMS = [
  "1 feed post + 2 reels + 5 stories",
  "2 rounds of content revisions",
  "Content usage rights: 3 months",
  "50% deposit, balance on delivery",
];

const PREMIUM_TERMS = [
  "Dedicated campaign manager",
  "3 rounds of content revisions",
  "Content usage rights: 6 months",
  "50% deposit, balance on delivery",
  "Performance report after 14 days",
];

const STARTER_TERMS = [
  "1 feed post + 3 stories",
  "1 round of content revisions",
  "Content usage rights: 1 month",
  "Full payment held in escrow until delivery",
];

// Keyed by Influencer.id — joined with MOCK_INFLUENCERS in the service.
export const MOCK_PROFILE_DETAILS: Record<string, InfluencerProfileDetails> = {
  "1": {
    bio: "Francis is a world-class athlete who shares training routines, fight camp stories and lessons on discipline with a massive, loyal fan base across Africa and beyond.",
    contentStyle: "High-energy training clips, behind-the-scenes documentaries and motivational talks — raw, powerful and authentic.",
    brandFit: ["Sportswear", "Fitness & Nutrition", "Telecoms", "Banking"],
    collaborations: [
      { brand: "Puma", campaign: "Global Ambassador", year: 2024 },
      { brand: "MTN Cameroon", campaign: "Brand Campaign", year: 2024 },
      { brand: "Guinness", campaign: "TV & Social Spot", year: 2023 },
    ],
    platformPricing: { facebook: 2_000_000, instagram: 3_500_000, tiktok: 2_500_000, youtube: 4_000_000 },
    minimumBooking: "1 month",
    contractTerms: PREMIUM_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money", "Bank transfer"],
  },
  "2": {
    bio: "Muriel is a fashion and lifestyle creator known for her elevated, editorial aesthetic and authentic storytelling. She has built a loyal, highly engaged community around beauty, style, and everyday luxury.",
    contentStyle: "Editorial photography, styled reels, and get-ready-with-me content with a soft, aspirational tone — designed to feel premium while staying relatable.",
    brandFit: ["Fashion & Apparel", "Beauty & Skincare", "Jewelry", "Lifestyle & Travel"],
    collaborations: [
      { brand: "Shea Radiance", campaign: "Product Launch Campaign", year: 2024 },
      { brand: "Zara", campaign: "Seasonal Lookbook", year: 2023 },
      { brand: "Glow Cosmetics", campaign: "Ambassador Program", year: 2023 },
    ],
    platformPricing: { facebook: 100_000, instagram: 250_000, tiktok: 200_000, youtube: 350_000 },
    minimumBooking: "1 week",
    contractTerms: STANDARD_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money"],
  },
  "3": {
    bio: "Samuel shares his journey from football legend to entrepreneur, with practical content on leadership, investing and building businesses in Africa.",
    contentStyle: "Interview-style videos, keynote clips and candid Q&A sessions — confident, direct and inspiring.",
    brandFit: ["Banking & Finance", "Real Estate", "Sportswear", "Education"],
    collaborations: [
      { brand: "Afriland First Bank", campaign: "Savings Campaign", year: 2024 },
      { brand: "Orange Cameroun", campaign: "Football Season Promo", year: 2023 },
      { brand: "Castel", campaign: "Event Sponsorship", year: 2023 },
    ],
    platformPricing: { facebook: 450_000, instagram: 600_000, tiktok: 500_000, youtube: 750_000 },
    minimumBooking: "2 weeks",
    contractTerms: STANDARD_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money", "Bank transfer"],
  },
  "4": {
    bio: "Standley is an award-winning hip-hop artist whose music and personality connect with young, urban audiences in both English and French.",
    contentStyle: "Studio sessions, performance snippets and dance challenges — playful, bold and trend-driven.",
    brandFit: ["Beverages", "Telecoms", "Streetwear", "Events"],
    collaborations: [
      { brand: "Orange Cameroun", campaign: "Music Festival", year: 2024 },
      { brand: "Top Pamplemousse", campaign: "Summer Campaign", year: 2023 },
      { brand: "Boomplay", campaign: "Album Launch Partner", year: 2023 },
    ],
    platformPricing: { facebook: 300_000, instagram: 500_000, tiktok: 450_000, youtube: 600_000 },
    minimumBooking: "1 week",
    contractTerms: STANDARD_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money"],
  },
  "5": {
    bio: "Daphnie creates beauty and fashion content celebrating African features, with honest product reviews her audience trusts.",
    contentStyle: "Tutorials, honest reviews and outfit reels — warm, educational and upbeat.",
    brandFit: ["Beauty & Skincare", "Hair Care", "Fashion & Apparel"],
    collaborations: [
      { brand: "Shea Radiance", campaign: "Review Series", year: 2024 },
      { brand: "Darling Hair", campaign: "Product Seeding", year: 2024 },
      { brand: "Nivea", campaign: "Skincare Challenge", year: 2023 },
    ],
    platformPricing: { facebook: 80_000, instagram: 150_000, tiktok: 120_000, youtube: 200_000 },
    minimumBooking: "1 week",
    contractTerms: STANDARD_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money"],
  },
  "6": {
    bio: "Blanche is a lifestyle and fashion creator documenting modern Cameroonian style, from street markets to the runway.",
    contentStyle: "Outfit transitions, styling tips and city vlogs — colourful, fun and fast-paced.",
    brandFit: ["Fashion & Apparel", "Beauty & Skincare", "Food & Drinks"],
    collaborations: [
      { brand: "Mode Afrique", campaign: "Capsule Collection", year: 2024 },
      { brand: "Glow Cosmetics", campaign: "Launch Event", year: 2023 },
    ],
    platformPricing: { facebook: 90_000, instagram: 180_000, tiktok: 150_000, youtube: 220_000 },
    minimumBooking: "1 week",
    contractTerms: STANDARD_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money"],
  },
  "7": {
    bio: "Edith is a singer and entertainer whose covers and originals reach a wide English-speaking audience across the North West and beyond.",
    contentStyle: "Acoustic covers, live sessions and comedy skits — heartfelt, charismatic and shareable.",
    brandFit: ["Telecoms", "Beverages", "Events", "Music Streaming"],
    collaborations: [
      { brand: "MTN Cameroon", campaign: "Data Bundle Promo", year: 2024 },
      { brand: "Boomplay", campaign: "Artist Spotlight", year: 2024 },
      { brand: "Guinness", campaign: "Concert Series", year: 2023 },
    ],
    platformPricing: { facebook: 400_000, instagram: 600_000, tiktok: 550_000, youtube: 800_000 },
    minimumBooking: "2 weeks",
    contractTerms: PREMIUM_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money", "Bank transfer"],
  },
  "8": {
    bio: "Amara is a rising beauty creator focused on affordable skincare routines for young women in Douala.",
    contentStyle: "Short tutorials and before/after routines — simple, friendly and practical.",
    brandFit: ["Beauty & Skincare", "Hair Care"],
    collaborations: [{ brand: "Shea Radiance", campaign: "Micro-influencer Program", year: 2025 }],
    platformPricing: { facebook: 25_000, instagram: 50_000, tiktok: 45_000 },
    minimumBooking: "3 days",
    contractTerms: STARTER_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money"],
  },
  "9": {
    bio: "Kevin is a personal trainer in Buea sharing home workouts and healthy eating on a budget.",
    contentStyle: "Follow-along workouts and meal-prep videos — motivating, clear and no-nonsense.",
    brandFit: ["Fitness & Nutrition", "Sportswear", "Health"],
    collaborations: [
      { brand: "FitLife Gym", campaign: "Membership Drive", year: 2025 },
      { brand: "Supermont", campaign: "Hydration Campaign", year: 2024 },
    ],
    platformPricing: { facebook: 40_000, instagram: 80_000, youtube: 120_000 },
    minimumBooking: "1 week",
    contractTerms: STARTER_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money"],
  },
  "10": {
    bio: "Grace helps young entrepreneurs start and grow small businesses, sharing tips on money, marketing and mindset.",
    contentStyle: "Carousel explainers, talking-head videos and live Q&As — clear, credible and practical.",
    brandFit: ["Banking & Finance", "Education", "Tech & Apps"],
    collaborations: [
      { brand: "Afriland First Bank", campaign: "SME Webinar Series", year: 2025 },
      { brand: "Jumia", campaign: "Seller Onboarding", year: 2024 },
    ],
    platformPricing: { facebook: 120_000, instagram: 150_000, youtube: 250_000 },
    minimumBooking: "1 week",
    contractTerms: STANDARD_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money", "Bank transfer"],
  },
  "11": {
    bio: "Lina is a new beauty and lifestyle creator with a small but very engaged French-speaking audience.",
    contentStyle: "Day-in-my-life clips and quick makeup looks — natural, spontaneous and relatable.",
    brandFit: ["Beauty & Skincare", "Fashion & Apparel"],
    collaborations: [{ brand: "Glow Cosmetics", campaign: "Product Seeding", year: 2026 }],
    platformPricing: { instagram: 30_000, tiktok: 35_000 },
    minimumBooking: "3 days",
    contractTerms: STARTER_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money"],
  },
  "12": {
    bio: "Nadia is a model and fashion creator from Bamenda who brings runway polish to everyday outfits.",
    contentStyle: "Lookbooks, runway recaps and styling reels — sleek, confident and polished.",
    brandFit: ["Fashion & Apparel", "Jewelry", "Beauty & Skincare"],
    collaborations: [
      { brand: "Mode Afrique", campaign: "Runway Show", year: 2025 },
      { brand: "Bijoux Kmer", campaign: "Jewelry Lookbook", year: 2025 },
    ],
    platformPricing: { facebook: 60_000, instagram: 120_000, tiktok: 90_000 },
    minimumBooking: "1 week",
    contractTerms: STANDARD_TERMS,
    paymentMethods: ["MTN MoMo", "Orange Money"],
  },
};
