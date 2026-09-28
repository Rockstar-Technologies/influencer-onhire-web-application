import Link from "next/link";
import type { ReactNode } from "react";
import { inter, jakarta } from "@/lib/fonts";
import { initials } from "@/lib/utils";
import { getCurrentAdmin } from "@/services/support.service";
import { AdminMobileNav, AdminSearch, AdminSidebar } from "./admin-nav";

export async function AdminShell({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();

  return (
    <div className={`${inter.variable} ${jakarta.variable} flex flex-1 flex-col bg-surface-alt font-body text-body`}>
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 lg:w-52">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy font-display text-xs font-bold text-white">
              IH
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold text-heading">Influencer On Hire</span>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">Admin</span>
            </span>
          </Link>

          <AdminSearch />

          <div className="ml-auto flex shrink-0 items-center gap-3 sm:ml-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-info-light text-xs font-bold text-navy">
              {initials(admin.name)}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold text-heading">{admin.name}</span>
              <span className="block text-xs text-muted">{admin.role}</span>
            </span>
          </div>
        </div>
        <AdminMobileNav />
      </header>

      <div className="flex flex-1">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
