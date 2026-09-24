import { Suspense } from "react";
import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardTopbar } from "@/components/shared/dashboard-topbar";
import { getCurrentBrandAccount } from "@/services/accounts.service";

export default async function BrandLayout({ children }: { children: ReactNode }) {
  const account = await getCurrentBrandAccount();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-alt font-sans lg:pl-60">
      <DashboardSidebar />
      <Suspense>
        <DashboardTopbar account={account} />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
