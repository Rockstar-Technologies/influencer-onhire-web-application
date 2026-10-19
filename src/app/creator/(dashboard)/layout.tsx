import { Suspense } from "react";
import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardTopbar } from "@/components/shared/dashboard-topbar";
import { CREATOR_DASHBOARD_NAV } from "@/constants/design-tokens";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { requireCreator } from "@/lib/auth/session";
import { initials } from "@/lib/utils";

export default async function CreatorLayout({ children }: { children: ReactNode }) {
  // Pending creators are sent to their application; only active creators reach the dashboards.
  const { user } = await requireCreator("/creator/requests");
  const account = { id: user.id, name: user.fullName, initials: initials(user.fullName), accountLabel: "Creator account" };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-alt font-sans lg:pl-60">
      <DashboardSidebar nav={CREATOR_DASHBOARD_NAV} />
      <Suspense>
        <DashboardTopbar
          account={account}
          bell={<NotificationBell area="creator" />}
          searchPlaceholder="Search requests..."
          placeholdersByPath={{ "/creator/earnings": "Search your campaigns..." }}
        />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
