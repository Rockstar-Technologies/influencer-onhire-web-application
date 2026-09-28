export type AccountType = "influencer" | "brand";

export type AccountStatus = "active" | "pending" | "suspended" | "rejected";

export type ComplianceStatus = "verified" | "in-review" | "missing";

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  type: AccountType;
  status: AccountStatus;
  location: string;
  // Content niche for influencers, industry for brands.
  niche: string;
  // Influencers only; brands have no audience of their own.
  followers: number | null;
  engagementRate: number | null;
  joinedAt: string;
  lastActiveAt: string;
  wallet: { available: number; inEscrow: number };
  compliance: ComplianceStatus;
  flagged: boolean;
}

export interface UserQuery {
  q: string;
  type: AccountType | "all";
  status: AccountStatus | "all";
  location: string;
  niche: string;
  minEngagement: number;
}

export interface UserFilterOptions {
  locations: string[];
  niches: string[];
}

export interface UserStats {
  total: number;
  influencers: number;
  brands: number;
  pendingApproval: number;
  suspended: number;
  inEscrow: number;
}

// --- per-user insights ---

export interface UserPerformance {
  // Earned by an influencer, or spent by a brand.
  lifetimeValue: number;
  campaignsCompleted: number;
  campaignSuccessRate: number;
  avgReviewScore: number;
  reviewCount: number;
}

export interface TrendPoint {
  month: string;
  // Follower count for influencers, active campaigns running for brands.
  audience: number;
  campaigns: number;
  revenue: number;
}

export type DisputeStatus = "open" | "resolved-in-favour" | "resolved-against";

export interface Dispute {
  id: string;
  campaign: string;
  reason: string;
  status: DisputeStatus;
  openedAt: string;
}

export type WalletTransactionKind = "escrow-held" | "released" | "refunded" | "withdrawal" | "deposit";

export interface WalletTransaction {
  id: string;
  kind: WalletTransactionKind;
  description: string;
  amount: number;
  date: string;
}

export type ComplianceDocumentKind = "contract" | "tax-id" | "business-registration" | "national-id";

export interface ComplianceDocument {
  id: string;
  kind: ComplianceDocumentKind;
  fileName: string;
  uploadedAt: string;
  status: "verified" | "in-review" | "rejected";
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  sentAt: string;
}

export interface UserProfile {
  user: PlatformUser;
  performance: UserPerformance;
  trend: TrendPoint[];
  disputes: Dispute[];
  transactions: WalletTransaction[];
  documents: ComplianceDocument[];
  notifications: UserNotification[];
}

// --- trust & safety ---

export type AlertKind = "failed-logins" | "follower-spike" | "payout-change";

export interface SecurityAlert {
  id: string;
  userId: string;
  userName: string;
  kind: AlertKind;
  detail: string;
  severity: "high" | "medium";
  detectedAt: string;
}

export type FlaggedField = "bio" | "campaign-description" | "media";

export interface ModerationFlag {
  id: string;
  userId: string;
  userName: string;
  field: FlaggedField;
  excerpt: string;
  reason: string;
  reportedAt: string;
}

// --- admin team ---

export const TEAM_ROLES = ["Super Admin", "Campaign Manager", "Finance", "Support Agent"] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "invited";
  lastActiveAt: string;
}

// --- action results (shared by server actions and client components) ---

export type BulkAction = "approve" | "reject" | "suspend" | "reactivate";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export type InviteField = "name" | "email" | "role";

export type InviteFormState =
  | { status: "idle" }
  | { status: "error"; values: Record<InviteField, string>; errors: Partial<Record<InviteField, string>> }
  | { status: "success"; member: TeamMember };
