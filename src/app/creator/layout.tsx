import { Suspense } from "react";
import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardTopbar } from "@/components/shared/dashboard-topbar";
import { CREATOR_DASHBOARD_NAV } from "@/constants/design-tokens";
import { getCurrentCreatorAccount } from "@/services/creator.service";

export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const account = await getCurrentCreatorAccount();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-alt font-sans lg:pl-60">
      <DashboardSidebar nav={CREATOR_DASHBOARD_NAV} />
      <Suspense>
        <DashboardTopbar
          account={account}
          searchPlaceholder="Search requests..."
          placeholdersByPath={{ "/creator/earnings": "Search your campaigns..." }}
        />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
