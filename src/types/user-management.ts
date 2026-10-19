// Canonical vocabulary: see src/lib/domain/vocabulary.ts. A creator is `creator` everywhere (the old `influencer` spelling only survives in saved links).
export type { AccountType } from "@/lib/domain/vocabulary";
import { ADMIN_ROLE } from "@/lib/domain/vocabulary";
import type { AdminRoleCode, AccountStatus as ApiAccountStatus, AccountType, AlertKind as ApiAlertKind, DisputeStatus as ApiDisputeStatus, DocumentKind, DocumentStatus, FlagField, AlertSeverity } from "@/lib/domain/vocabulary";
import type { ComplianceDisplayStatus, WalletTransactionKind as UiWalletTransactionKind } from "@/lib/domain/frontend-only";

export type AccountStatus = ApiAccountStatus;

/** The API's document statuses plus the UI-only "missing" (nothing uploaded); see src/lib/domain/frontend-only.ts. */
export type ComplianceStatus = ComplianceDisplayStatus;

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

export type DisputeStatus = ApiDisputeStatus;

export interface Dispute {
  id: string;
  campaign: string;
  reason: string;
  status: DisputeStatus;
  openedAt: string;
}

// UI-only vocabulary (the API has different ledger types and no "deposit"); mapping is unresolved, see src/lib/domain/frontend-only.ts.
export type WalletTransactionKind = UiWalletTransactionKind;

export interface WalletTransaction {
  id: string;
  kind: WalletTransactionKind;
  description: string;
  amount: number;
  date: string;
}

export type ComplianceDocumentKind = DocumentKind;

export interface ComplianceDocument {
  id: string;
  kind: ComplianceDocumentKind;
  fileName: string;
  uploadedAt: string;
  status: DocumentStatus;
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

export type AlertKind = ApiAlertKind;

export interface SecurityAlert {
  id: string;
  userId: string;
  userName: string;
  kind: AlertKind;
  detail: string;
  severity: AlertSeverity;
  detectedAt: string;
}

export type FlaggedField = FlagField;

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

/** Admin team roles by the API's role code (super_admin, campaign_manager, finance, support_agent); show them with ADMIN_ROLE_LABELS. */
export const TEAM_ROLES = ADMIN_ROLE.values;

export type TeamRole = AdminRoleCode;

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
