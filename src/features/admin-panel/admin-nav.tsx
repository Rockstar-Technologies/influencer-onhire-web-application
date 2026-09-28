"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCreditCard,
  FiGrid,
  FiLifeBuoy,
  FiSearch,
  FiSettings,
  FiSpeaker,
  FiUsers,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: IconType;
  // Missing href means the module isn't built yet.
  href?: string;
  exact?: boolean;
  search?: { action: string; placeholder: string };
}

const NAV: NavItem[] = [
  { label: "Overview", icon: FiGrid, href: "/admin", exact: true, search: { action: "/admin/users", placeholder: "Search users by name or email..." } },
  { label: "Users", icon: FiUsers, href: "/admin/users", search: { action: "/admin/users", placeholder: "Search users by name or email..." } },
  { label: "Campaigns", icon: FiSpeaker },
  { label: "Payments", icon: FiCreditCard, href: "/admin/payments", search: { action: "/admin/payments", placeholder: "Search invoices, campaigns, brands..." } },
  { label: "Support", icon: FiLifeBuoy, href: "/admin/support", search: { action: "/admin/support", placeholder: "Search tickets..." } },
  { label: "Disputes", icon: FiAlertTriangle },
  { label: "Reports", icon: FiBarChart2 },
  { label: "Settings", icon: FiSettings },
];

function useActiveItem() {
  const pathname = usePathname();
  return NAV.find((item) => item.href && (item.exact ? pathname === item.href : pathname.startsWith(item.href))) ?? NAV[0];
}

function NavEntry({ item, active, compact }: { item: NavItem; active: boolean; compact?: boolean }) {
  const Icon = item.icon;
  const base = cn(
    "flex shrink-0 items-center gap-3 rounded-lg text-sm font-semibold transition-colors",
    compact ? "px-3 py-1.5" : "px-3 py-2.5",
  );

  if (!item.href) {
    return (
      <span aria-disabled className={cn(base, "cursor-default text-muted/70")}>
        <Icon aria-hidden className="shrink-0" />
        {item.label}
        <span className="ml-auto rounded-full bg-border-light px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Soon</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        active ? "bg-navy text-white shadow-sm shadow-navy/20" : "text-body hover:bg-surface-alt hover:text-heading",
      )}
    >
      <Icon aria-hidden className="shrink-0" />
      {item.label}
    </Link>
  );
}

export function AdminSidebar() {
  const active = useActiveItem();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
      <nav aria-label="Admin modules" className="sticky top-16 flex flex-col gap-1 p-4">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Modules</p>
        {NAV.map((item) => (
          <NavEntry key={item.label} item={item} active={item === active} />
        ))}
      </nav>
    </aside>
  );
}

// Below lg the sidebar becomes a scrollable strip under the header. Unbuilt modules are left out to save room.
export function AdminMobileNav() {
  const active = useActiveItem();
  return (
    <nav aria-label="Admin modules" className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:hidden">
      {NAV.filter((item) => item.href).map((item) => (
        <NavEntry key={item.label} item={item} active={item === active} compact />
      ))}
    </nav>
  );
}

export function AdminSearch() {
  const active = useActiveItem();
  const search = active.search ?? NAV[0].search!;
  return (
    <Form
      action={search.action}
      role="search"
      className="mx-auto hidden w-full min-w-0 max-w-md items-center gap-2 rounded-lg border border-border bg-surface-alt p-1 pl-3 sm:flex"
    >
      <FiSearch className="shrink-0 text-muted" aria-hidden />
      <label htmlFor="admin-search" className="sr-only">
        {search.placeholder}
      </label>
      <input
        id="admin-search"
        name="q"
        placeholder={search.placeholder}
        className="h-8 min-w-0 flex-1 bg-transparent text-sm text-heading placeholder:text-muted focus:outline-none"
      />
      <button
        type="submit"
        className="h-8 shrink-0 rounded-md bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-hover"
      >
        Search
      </button>
    </Form>
  );
}
