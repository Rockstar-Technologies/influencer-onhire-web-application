"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin/users", label: "Users", placeholder: "Search users by name or email..." },
  { href: "/admin/support", label: "Support", placeholder: "Search tickets..." },
];

function useActiveSection() {
  const pathname = usePathname();
  return SECTIONS.find((section) => pathname.startsWith(section.href)) ?? SECTIONS[0];
}

export function AdminNav() {
  const active = useActiveSection();
  return (
    <nav aria-label="Admin sections" className="flex shrink-0 items-center gap-1">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          aria-current={section === active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
            section === active ? "bg-info-light text-navy" : "text-body hover:bg-surface-alt hover:text-heading",
          )}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminSearch() {
  const active = useActiveSection();
  return (
    <Form
      action={active.href}
      role="search"
      className="mx-auto hidden w-full min-w-0 max-w-md items-center sm:flex gap-2 rounded-lg border border-border bg-surface-alt p-1 pl-3"
    >
      <FiSearch className="shrink-0 text-muted" aria-hidden />
      <label htmlFor="admin-search" className="sr-only">
        {active.placeholder}
      </label>
      <input
        id="admin-search"
        name="q"
        placeholder={active.placeholder}
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
