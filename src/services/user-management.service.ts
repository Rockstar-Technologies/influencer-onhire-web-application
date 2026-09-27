import type {
  AccountStatus,
  BulkAction,
  ModerationFlag,
  PlatformUser,
  SecurityAlert,
  TeamMember,
  TeamRole,
  UserFilterOptions,
  UserNotification,
  UserProfile,
  UserQuery,
  UserStats,
} from "@/types/user-management";
import {
  MOCK_ALERTS,
  MOCK_DISPUTES,
  MOCK_DOCUMENTS,
  MOCK_FLAGS,
  MOCK_NOTIFICATIONS,
  MOCK_PERFORMANCE,
  MOCK_PLATFORM_USERS,
  MOCK_TEAM,
  MOCK_TRANSACTIONS,
  MOCK_TRENDS,
} from "./mock/user-management.mock";

export async function listPlatformUsers(query: UserQuery): Promise<PlatformUser[]> {
  // TODO: replace with `fetch("/api/admin/users?" + params)` once the backend exists
  const term = query.q.trim().toLowerCase();
  return MOCK_PLATFORM_USERS.filter(
    (user) =>
      (query.type === "all" || user.type === query.type) &&
      (query.status === "all" || user.status === query.status) &&
      (!query.location || user.location === query.location) &&
      (!query.niche || user.niche === query.niche) &&
      (query.minEngagement === 0 || (user.engagementRate ?? 0) >= query.minEngagement) &&
      (!term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)),
  ).sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
}

export async function getUserFilterOptions(): Promise<UserFilterOptions> {
  const unique = (values: string[]) => [...new Set(values)].sort();
  return {
    locations: unique(MOCK_PLATFORM_USERS.map((user) => user.location)),
    niches: unique(MOCK_PLATFORM_USERS.map((user) => user.niche)),
  };
}

export async function getUserStats(): Promise<UserStats> {
  // TODO: replace with `fetch("/api/admin/users/stats")`
  const users = MOCK_PLATFORM_USERS;
  return {
    total: users.length,
    influencers: users.filter((user) => user.type === "influencer").length,
    brands: users.filter((user) => user.type === "brand").length,
    pendingApproval: users.filter((user) => user.status === "pending").length,
    suspended: users.filter((user) => user.status === "suspended").length,
    inEscrow: users.reduce((sum, user) => sum + user.wallet.inEscrow, 0),
  };
}

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  // TODO: replace with `fetch("/api/admin/users/" + id)`
  const user = MOCK_PLATFORM_USERS.find((candidate) => candidate.id === id);
  if (!user) return null;
  return {
    user,
    performance: MOCK_PERFORMANCE[id] ?? { lifetimeValue: 0, campaignsCompleted: 0, campaignSuccessRate: 0, avgReviewScore: 0, reviewCount: 0 },
    trend: MOCK_TRENDS[id] ?? [],
    disputes: MOCK_DISPUTES[id] ?? [],
    transactions: MOCK_TRANSACTIONS[id] ?? [],
    documents: MOCK_DOCUMENTS[id] ?? [],
    notifications: MOCK_NOTIFICATIONS.filter((notification) => notification.userId === id).sort((a, b) =>
      b.sentAt.localeCompare(a.sentAt),
    ),
  };
}

// Which statuses each action may move a user out of; anything else is skipped, not an error.
const TRANSITIONS: Record<BulkAction, { from: AccountStatus[]; to: AccountStatus; notice: string }> = {
  approve: { from: ["pending"], to: "active", notice: "Your account has been approved. You can now join campaigns." },
  reject: { from: ["pending"], to: "rejected", notice: "Your application was not approved. Contact support for details." },
  suspend: { from: ["active", "pending"], to: "suspended", notice: "Your account has been suspended pending review. Contact support to appeal." },
  reactivate: { from: ["suspended", "rejected"], to: "active", notice: "Your account has been reactivated." },
};

const NOTICE_TITLES: Record<BulkAction, string> = {
  approve: "Your account has been approved",
  reject: "Application update",
  suspend: "Your account has been suspended",
  reactivate: "Your account is active again",
};

export async function applyUserAction(ids: string[], action: BulkAction): Promise<PlatformUser[]> {
  // TODO: replace with `fetch("/api/admin/users/bulk", { method: "POST", body: JSON.stringify({ ids, action }) })`
  const rule = TRANSITIONS[action];
  const changed = MOCK_PLATFORM_USERS.filter((user) => ids.includes(user.id) && rule.from.includes(user.status));
  for (const user of changed) {
    user.status = rule.to;
    notify(user.id, NOTICE_TITLES[action], rule.notice);
  }
  return changed;
}

export async function sendUserMessage(ids: string[], subject: string, body: string): Promise<number> {
  // TODO: replace with `fetch("/api/admin/users/messages", { method: "POST", ... })`
  const recipients = MOCK_PLATFORM_USERS.filter((user) => ids.includes(user.id));
  for (const user of recipients) notify(user.id, subject, body);
  return recipients.length;
}

export async function setUserFlagged(id: string, flagged: boolean): Promise<PlatformUser | null> {
  const user = MOCK_PLATFORM_USERS.find((candidate) => candidate.id === id);
  if (user) user.flagged = flagged;
  return user ?? null;
}

function notify(userId: string, title: string, body: string): UserNotification {
  const notification = { id: `n-${MOCK_NOTIFICATIONS.length + 1}`, userId, title, body, sentAt: new Date().toISOString() };
  MOCK_NOTIFICATIONS.push(notification);
  return notification;
}

// --- trust & safety ---

export async function listSecurityAlerts(): Promise<SecurityAlert[]> {
  // TODO: replace with `fetch("/api/admin/alerts")` — the backend raises these from login and follower tracking
  return [...MOCK_ALERTS].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

export async function dismissSecurityAlert(id: string): Promise<boolean> {
  const index = MOCK_ALERTS.findIndex((alert) => alert.id === id);
  if (index === -1) return false;
  MOCK_ALERTS.splice(index, 1);
  return true;
}

export async function listModerationFlags(): Promise<ModerationFlag[]> {
  // TODO: replace with `fetch("/api/admin/moderation")`
  return [...MOCK_FLAGS].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

export async function resolveModerationFlag(id: string, decision: "remove" | "dismiss"): Promise<ModerationFlag | null> {
  const index = MOCK_FLAGS.findIndex((flag) => flag.id === id);
  if (index === -1) return null;
  const [flag] = MOCK_FLAGS.splice(index, 1);
  if (decision === "remove") {
    notify(flag.userId, "Content removed", `Content in your ${flag.field.replace("-", " ")} was removed: ${flag.reason}.`);
  }
  return flag;
}

// --- admin team ---

export async function listTeamMembers(): Promise<TeamMember[]> {
  // TODO: replace with `fetch("/api/admin/team")`
  return [...MOCK_TEAM];
}

export async function inviteTeamMember(input: { name: string; email: string; role: TeamRole }): Promise<TeamMember | null> {
  // TODO: replace with `fetch("/api/admin/team/invites", { method: "POST", ... })` — that endpoint sends the email
  if (MOCK_TEAM.some((member) => member.email.toLowerCase() === input.email.toLowerCase())) return null;
  const member: TeamMember = { id: `m-${MOCK_TEAM.length + 1}`, ...input, status: "invited", lastActiveAt: new Date().toISOString() };
  MOCK_TEAM.push(member);
  return member;
}
