"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BrandAccount } from "@/types/account";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

// Search writes to the ?q= param of the current dashboard page, which the page
// uses to filter its own list.
function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="order-2 flex w-full items-center gap-2 rounded-xl border border-border bg-surface-alt py-1 pl-3 pr-1 transition-colors focus-within:border-primary-border focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/10 sm:order-1 sm:mx-auto sm:w-96"
    >
      <span className="text-muted">
        <SearchIcon />
      </span>
      <label htmlFor="dashboard-search" className="sr-only">
        Search your campaigns
      </label>
      <input
        id="dashboard-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your campaigns..."
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-heading outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Search
      </button>
    </form>
  );
}

export function DashboardTopbar({ account }: { account: BrandAccount }) {
  // Re-mount the form whenever ?q= changes (e.g. "Clear search") so the box matches the URL.
  const q = useSearchParams().get("q") ?? "";

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-border/80 bg-surface/90 px-4 py-2.5 backdrop-blur sm:px-6">
      <SearchForm key={q} initialQuery={q} />

      <div className="order-1 ml-auto flex items-center gap-3 sm:order-2 sm:ml-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
          {account.initials}
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-heading">{account.name}</span>
          <span className="block text-xs text-muted">{account.accountLabel}</span>
        </span>
      </div>
    </header>
  );
}
