"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_DASHBOARD_NAV } from "@/constants/design-tokens";
import type { DashboardNavSection } from "@/constants/design-tokens";
import { cn } from "@/lib/utils";

type IconName = DashboardNavSection["links"][number]["icon"];

function NavIcon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  if (name === "wallet") {
    return (
      <svg {...common}>
        <rect x="3" y="5.5" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
      </svg>
    );
  }
  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 10.5L12 4l8 6.5V20H4z" strokeLinejoin="round" />
    </svg>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-[#0b1220] text-slate-300 lg:fixed lg:inset-y-0 lg:left-0 lg:w-60">
      <Link href="/" className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">IH</span>
        <span className="text-base font-semibold text-white">Influencer On Hire</span>
      </Link>

      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:mt-5 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-3">
        {BRAND_DASHBOARD_NAV.map((section) => (
          <div key={section.label} className="flex shrink-0 gap-1 lg:mb-5 lg:flex-col lg:gap-0.5">
            <p className="hidden px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 lg:block">
              {section.label}
            </p>
            {section.links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-white/10 text-white lg:before:absolute lg:before:inset-y-2 lg:before:-left-3 lg:before:w-1 lg:before:rounded-r-full lg:before:bg-primary"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className={active ? "text-primary-border" : undefined}>
                    <NavIcon name={link.icon} />
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
