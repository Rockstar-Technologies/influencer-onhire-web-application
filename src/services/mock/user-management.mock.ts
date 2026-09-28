import type {
  ComplianceDocument,
  Dispute,
  ModerationFlag,
  PlatformUser,
  SecurityAlert,
  TeamMember,
  TrendPoint,
  UserNotification,
  UserPerformance,
  WalletTransaction,
} from "@/types/user-management";

// Timestamps are relative to server start so "2 hours ago" stays believable in dev.
const now = Date.now();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const HOUR = 60;
const DAY = 24 * HOUR;

// In-memory stand-in for the users table. Status changes mutate these rows.
export const MOCK_PLATFORM_USERS: PlatformUser[] = [
  {
    id: "u-101", name: "Amara Nkemelu", email: "amara@styleby.cm", type: "influencer", status: "active",
    location: "Douala", niche: "Fashion", followers: 184_000, engagementRate: 6.2,
    joinedAt: minutesAgo(310 * DAY), lastActiveAt: minutesAgo(25),
    wallet: { available: 420_000, inEscrow: 350_000 }, compliance: "verified", flagged: false,
  },
  {
    id: "u-102", name: "James Mwangi", email: "james.mwangi@mail.com", type: "influencer", status: "active",
    location: "Nairobi", niche: "Tech", followers: 96_500, engagementRate: 4.8,
    joinedAt: minutesAgo(220 * DAY), lastActiveAt: minutesAgo(3 * HOUR),
    wallet: { available: 85_000, inEscrow: 200_000 }, compliance: "verified", flagged: true,
  },
  {
    id: "u-103", name: "Lindiwe Osei", email: "lindiwe.o@creator.africa", type: "influencer", status: "pending",
    location: "Accra", niche: "Beauty", followers: 52_300, engagementRate: 7.1,
    joinedAt: minutesAgo(2 * DAY), lastActiveAt: minutesAgo(6 * HOUR),
    wallet: { available: 0, inEscrow: 0 }, compliance: "in-review", flagged: false,
  },
  {
    id: "u-104", name: "Kofi Mensah", email: "kofi.eats@mail.com", type: "influencer", status: "pending",
    location: "Accra", niche: "Food", followers: 31_800, engagementRate: 3.9,
    joinedAt: minutesAgo(1 * DAY), lastActiveAt: minutesAgo(1 * DAY),
    wallet: { available: 0, inEscrow: 0 }, compliance: "missing", flagged: false,
  },
  {
    id: "u-105", name: "Muriel Blanch", email: "muriel@fitwithmuriel.com", type: "influencer", status: "active",
    location: "Yaoundé", niche: "Fitness", followers: 243_000, engagementRate: 5.4,
    joinedAt: minutesAgo(400 * DAY), lastActiveAt: minutesAgo(50),
    wallet: { available: 610_000, inEscrow: 150_000 }, compliance: "verified", flagged: false,
  },
  {
    id: "u-106", name: "Tariq Bello", email: "tariq.travels@mail.com", type: "influencer", status: "suspended",
    location: "Lagos", niche: "Travel", followers: 128_000, engagementRate: 1.6,
    joinedAt: minutesAgo(180 * DAY), lastActiveAt: minutesAgo(9 * DAY),
    wallet: { available: 40_000, inEscrow: 0 }, compliance: "verified", flagged: true,
  },
  {
    id: "u-107", name: "Shea Radiance", email: "partners@shearadiance.com", type: "brand", status: "active",
    location: "Douala", niche: "Beauty", followers: null, engagementRate: null,
    joinedAt: minutesAgo(260 * DAY), lastActiveAt: minutesAgo(2 * HOUR),
    wallet: { available: 1_200_000, inEscrow: 900_000 }, compliance: "verified", flagged: false,
  },
  {
    id: "u-108", name: "Kivu Coffee Co.", email: "marketing@kivucoffee.rw", type: "brand", status: "pending",
    location: "Kigali", niche: "Food", followers: null, engagementRate: null,
    joinedAt: minutesAgo(3 * DAY), lastActiveAt: minutesAgo(20 * HOUR),
    wallet: { available: 0, inEscrow: 0 }, compliance: "in-review", flagged: false,
  },
  {
    id: "u-109", name: "PayLink Mobile", email: "growth@paylink.africa", type: "brand", status: "active",
    location: "Nairobi", niche: "Tech", followers: null, engagementRate: null,
    joinedAt: minutesAgo(150 * DAY), lastActiveAt: minutesAgo(5 * HOUR),
    wallet: { available: 2_300_000, inEscrow: 1_450_000 }, compliance: "verified", flagged: false,
  },
  {
    id: "u-110", name: "Wanderlust Tours", email: "hello@wanderlust.ng", type: "brand", status: "active",
    location: "Lagos", niche: "Travel", followers: null, engagementRate: null,
    joinedAt: minutesAgo(90 * DAY), lastActiveAt: minutesAgo(4 * DAY),
    wallet: { available: 300_000, inEscrow: 0 }, compliance: "missing", flagged: false,
  },
];

export const MOCK_PERFORMANCE: Record<string, UserPerformance> = {
  "u-101": { lifetimeValue: 4_850_000, campaignsCompleted: 38, campaignSuccessRate: 97, avgReviewScore: 4.9, reviewCount: 34 },
  "u-102": { lifetimeValue: 1_920_000, campaignsCompleted: 17, campaignSuccessRate: 88, avgReviewScore: 4.4, reviewCount: 15 },
  "u-105": { lifetimeValue: 6_400_000, campaignsCompleted: 52, campaignSuccessRate: 96, avgReviewScore: 4.8, reviewCount: 47 },
  "u-106": { lifetimeValue: 870_000, campaignsCompleted: 9, campaignSuccessRate: 67, avgReviewScore: 3.1, reviewCount: 8 },
  "u-107": { lifetimeValue: 9_300_000, campaignsCompleted: 41, campaignSuccessRate: 93, avgReviewScore: 4.7, reviewCount: 39 },
  "u-109": { lifetimeValue: 14_200_000, campaignsCompleted: 63, campaignSuccessRate: 95, avgReviewScore: 4.6, reviewCount: 58 },
  "u-110": { lifetimeValue: 1_100_000, campaignsCompleted: 6, campaignSuccessRate: 83, avgReviewScore: 4.2, reviewCount: 5 },
};

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];

// Six months of history per user. Tariq's June spike is what raised the follower-spike alert.
export const MOCK_TRENDS: Record<string, TrendPoint[]> = {
  "u-101": series([128_000, 139_000, 151_000, 162_000, 171_000, 184_000], [4, 5, 6, 5, 7, 8], [520_000, 610_000, 700_000, 640_000, 820_000, 910_000]),
  "u-102": series([71_000, 76_000, 82_000, 85_000, 90_000, 96_500], [2, 3, 2, 3, 3, 4], [180_000, 260_000, 190_000, 300_000, 320_000, 410_000]),
  "u-103": series([44_000, 46_000, 48_000, 49_500, 51_000, 52_300], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
  "u-104": series([27_000, 28_000, 29_500, 30_000, 31_000, 31_800], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
  "u-105": series([205_000, 214_000, 222_000, 229_000, 236_000, 243_000], [7, 8, 9, 8, 10, 10], [900_000, 1_050_000, 1_120_000, 1_000_000, 1_300_000, 1_240_000]),
  "u-106": series([41_000, 43_000, 119_000, 124_000, 127_000, 128_000], [2, 1, 3, 2, 1, 0], [120_000, 90_000, 210_000, 150_000, 60_000, 0]),
  "u-107": series([3, 4, 5, 4, 6, 7], [3, 4, 5, 4, 6, 7], [1_100_000, 1_400_000, 1_650_000, 1_300_000, 1_900_000, 2_100_000]),
  "u-108": series([0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
  "u-109": series([6, 8, 9, 11, 10, 12], [6, 8, 9, 11, 10, 12], [1_800_000, 2_300_000, 2_600_000, 3_100_000, 2_800_000, 3_400_000]),
  "u-110": series([0, 1, 1, 2, 1, 1], [0, 1, 1, 2, 1, 1], [0, 180_000, 200_000, 390_000, 150_000, 180_000]),
};

function series(audience: number[], campaigns: number[], revenue: number[]): TrendPoint[] {
  return MONTHS.map((month, i) => ({ month, audience: audience[i], campaigns: campaigns[i], revenue: revenue[i] }));
}

export const MOCK_DISPUTES: Record<string, Dispute[]> = {
  "u-102": [
    { id: "d-41", campaign: "PayLink Summer Cashback", reason: "Escrow not released 5 days after delivery", status: "open", openedAt: minutesAgo(5 * DAY) },
  ],
  "u-106": [
    { id: "d-33", campaign: "Wanderlust Zanzibar Promo", reason: "Content never delivered", status: "resolved-against", openedAt: minutesAgo(40 * DAY) },
    { id: "d-37", campaign: "Kivu Coffee Morning Ritual", reason: "Engagement figures appeared inflated", status: "open", openedAt: minutesAgo(12 * DAY) },
  ],
  "u-101": [
    { id: "d-12", campaign: "Shea Radiance Launch", reason: "Brand requested extra revisions beyond scope", status: "resolved-in-favour", openedAt: minutesAgo(120 * DAY) },
  ],
};

export const MOCK_TRANSACTIONS: Record<string, WalletTransaction[]> = {
  "u-101": [
    { id: "w-1", kind: "escrow-held", description: "Shea Radiance · Autumn Glow campaign", amount: 350_000, date: minutesAgo(2 * DAY) },
    { id: "w-2", kind: "released", description: "PayLink Mobile · App launch reel", amount: 280_000, date: minutesAgo(9 * DAY) },
    { id: "w-3", kind: "withdrawal", description: "Withdrawal to MTN MoMo ••• 4471", amount: -300_000, date: minutesAgo(12 * DAY) },
  ],
  "u-102": [
    { id: "w-4", kind: "escrow-held", description: "PayLink Summer Cashback", amount: 200_000, date: minutesAgo(14 * DAY) },
    { id: "w-5", kind: "released", description: "Kivu Coffee · Unboxing video", amount: 85_000, date: minutesAgo(30 * DAY) },
  ],
  "u-106": [
    { id: "w-6", kind: "refunded", description: "Wanderlust Zanzibar Promo · refunded to brand", amount: -150_000, date: minutesAgo(38 * DAY) },
    { id: "w-7", kind: "released", description: "Kivu Coffee · Story set", amount: 40_000, date: minutesAgo(60 * DAY) },
  ],
  "u-107": [
    { id: "w-8", kind: "deposit", description: "Top-up via bank transfer", amount: 1_500_000, date: minutesAgo(3 * DAY) },
    { id: "w-9", kind: "escrow-held", description: "Autumn Glow campaign · 3 creators", amount: -900_000, date: minutesAgo(2 * DAY) },
  ],
  "u-109": [
    { id: "w-10", kind: "deposit", description: "Top-up via card", amount: 2_000_000, date: minutesAgo(20 * DAY) },
    { id: "w-11", kind: "escrow-held", description: "Summer Cashback · 6 creators", amount: -1_450_000, date: minutesAgo(15 * DAY) },
  ],
};

export const MOCK_DOCUMENTS: Record<string, ComplianceDocument[]> = {
  "u-101": [
    { id: "c-1", kind: "national-id", fileName: "national-id.pdf", uploadedAt: minutesAgo(300 * DAY), status: "verified" },
    { id: "c-2", kind: "tax-id", fileName: "niu-certificate.pdf", uploadedAt: minutesAgo(300 * DAY), status: "verified" },
    { id: "c-3", kind: "contract", fileName: "creator-agreement-signed.pdf", uploadedAt: minutesAgo(305 * DAY), status: "verified" },
  ],
  "u-103": [
    { id: "c-4", kind: "national-id", fileName: "ghana-card.jpg", uploadedAt: minutesAgo(2 * DAY), status: "in-review" },
    { id: "c-5", kind: "contract", fileName: "creator-agreement.pdf", uploadedAt: minutesAgo(2 * DAY), status: "in-review" },
  ],
  "u-107": [
    { id: "c-6", kind: "business-registration", fileName: "rccm-shea-radiance.pdf", uploadedAt: minutesAgo(255 * DAY), status: "verified" },
    { id: "c-7", kind: "tax-id", fileName: "tax-clearance-2026.pdf", uploadedAt: minutesAgo(60 * DAY), status: "verified" },
  ],
  "u-108": [
    { id: "c-8", kind: "business-registration", fileName: "rdb-certificate.pdf", uploadedAt: minutesAgo(3 * DAY), status: "in-review" },
  ],
  "u-110": [
    { id: "c-9", kind: "business-registration", fileName: "cac-certificate.jpg", uploadedAt: minutesAgo(85 * DAY), status: "rejected" },
  ],
};

// Every automatic user-facing message lands here so admins can see what a user was told.
export const MOCK_NOTIFICATIONS: UserNotification[] = [
  { id: "n-1", userId: "u-106", title: "Your account has been suspended", body: "Your account is under review following a reported dispute. Contact support to appeal.", sentAt: minutesAgo(9 * DAY) },
  { id: "n-2", userId: "u-101", title: "Payment released", body: "280,000 CFA for “App launch reel” has been released to your wallet.", sentAt: minutesAgo(9 * DAY) },
  { id: "n-3", userId: "u-101", title: "New campaign invite", body: "Shea Radiance invited you to “Autumn Glow”.", sentAt: minutesAgo(4 * DAY) },
];

export const MOCK_ALERTS: SecurityAlert[] = [
  { id: "a-1", userId: "u-102", userName: "James Mwangi", kind: "failed-logins", detail: "7 failed sign-in attempts from 3 countries in 20 minutes", severity: "high", detectedAt: minutesAgo(40) },
  { id: "a-2", userId: "u-106", userName: "Tariq Bello", kind: "follower-spike", detail: "Followers grew 177% in one month while engagement fell to 1.6%", severity: "high", detectedAt: minutesAgo(2 * DAY) },
  { id: "a-3", userId: "u-110", userName: "Wanderlust Tours", kind: "payout-change", detail: "Payout account changed twice in 24 hours", severity: "medium", detectedAt: minutesAgo(8 * HOUR) },
];

export const MOCK_FLAGS: ModerationFlag[] = [
  { id: "f-1", userId: "u-102", userName: "James Mwangi", field: "bio", excerpt: "DM me for guaranteed 10x crypto returns 🚀", reason: "Possible financial scam promotion", reportedAt: minutesAgo(3 * HOUR) },
  { id: "f-2", userId: "u-110", userName: "Wanderlust Tours", field: "campaign-description", excerpt: "Creators must pay a 50,000 CFA registration fee before joining…", reason: "Charging creators to apply violates platform policy", reportedAt: minutesAgo(1 * DAY) },
  { id: "f-3", userId: "u-106", userName: "Tariq Bello", field: "media", excerpt: "beach-promo-final.mp4", reason: "Reported by 3 users as containing copyrighted music", reportedAt: minutesAgo(2 * DAY) },
];

export const MOCK_TEAM: TeamMember[] = [
  { id: "m-1", name: "Samuel Ndolo", email: "ndolosam237@gmail.com", role: "Super Admin", status: "active", lastActiveAt: minutesAgo(0) },
  { id: "m-2", name: "Rita Wambui", email: "rita.w@influenceronhire.com", role: "Campaign Manager", status: "active", lastActiveAt: minutesAgo(2 * HOUR) },
  { id: "m-3", name: "Tunde Okafor", email: "tunde.o@influenceronhire.com", role: "Finance", status: "active", lastActiveAt: minutesAgo(1 * DAY) },
  { id: "m-4", name: "Chiara Mensah", email: "chiara.m@influenceronhire.com", role: "Support Agent", status: "invited", lastActiveAt: minutesAgo(5 * DAY) },
];
