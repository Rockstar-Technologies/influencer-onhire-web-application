import Link from "next/link";
import type { ReactNode } from "react";
import { FiLogOut } from "react-icons/fi";
import { inter, jakarta } from "@/lib/fonts";
import { initials } from "@/lib/utils";
import type { PlatformUser } from "@/types/user-management";
import { signOutAction } from "./actions";

export function AccountShell({ account, children }: { account: PlatformUser; children: ReactNode }) {
  const isBrand = account.type === "brand";
  const area = isBrand ? "/brand" : "/creator";

  return (
    <div className={`${inter.variable} ${jakarta.variable} flex flex-1 flex-col bg-surface-alt font-body text-body`}>
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href={`${area}/payments`} className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy font-display text-xs font-bold text-white">IH</span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold text-heading">Influencer On Hire</span>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">{isBrand ? "Brand" : "Creator"} dashboard</span>
            </span>
          </Link>

          <nav aria-label="Account" className="ml-4 hidden items-center gap-1 sm:flex">
            <Link href={`${area}/payments`} aria-current="page" className="rounded-md bg-info-light px-3 py-1.5 text-sm font-semibold text-navy">
              Payments
            </Link>
            {isBrand && (
              <Link href="/influencers" className="rounded-md px-3 py-1.5 text-sm font-semibold text-body hover:bg-surface-alt hover:text-heading">
                Find influencers
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-info-light text-xs font-bold text-navy">{initials(account.name)}</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold text-heading">{account.name}</span>
              <span className="block text-xs text-muted">{isBrand ? "Brand account" : "Creator account"}</span>
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-heading hover:border-navy/30 hover:text-navy"
              >
                <FiLogOut aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
