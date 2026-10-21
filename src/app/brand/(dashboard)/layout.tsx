import { Suspense } from "react";
import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardTopbar } from "@/components/shared/dashboard-topbar";
import { BRAND_DASHBOARD_NAV } from "@/constants/design-tokens";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { requireBrand } from "@/lib/auth/session";
import { initials } from "@/lib/utils";

export default async function BrandLayout({ children }: { children: ReactNode }) {
  const { user } = await requireBrand("/brand/campaign-payments");
  const account = { id: user.id, name: user.fullName, initials: initials(user.fullName), accountLabel: "Brand account" };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-alt font-sans lg:pl-60">
      <DashboardSidebar nav={BRAND_DASHBOARD_NAV} />
      <Suspense>
        <DashboardTopbar account={account} searchPlaceholder="Search your campaigns..." bell={<NotificationBell area="brand" />} />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
