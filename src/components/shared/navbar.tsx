"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./button";
import { NAV_LINKS } from "@/constants/design-tokens";
import { cn } from "@/lib/utils";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-primary/30">
        IH
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold text-heading">Influencer</span>
        <span className="text-[11px] font-bold tracking-wide text-primary">ON HIRE</span>
      </span>
    </Link>
  );
}

// A link is "current" when the visitor is on its page or one of its sub-pages
// (e.g. /campaigns/new keeps "Post a Campaign" highlighted). Coming-soon links
// share one route, so they never count as current.
function isCurrent(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/coming-soon") return false;
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

// Underline under a desktop link: slides in on hover, stays for the current
// page, and pulses while the clicked page is still loading.
function Underline({ active }: { active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-x-3 -bottom-[3px] h-[3px] origin-center rounded-full bg-primary transition-transform duration-300 ease-out",
        active || pending ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        pending && "animate-pulse"
      )}
    />
  );
}

// Small dot beside a mobile link while its page is loading.
function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn("h-2 w-2 rounded-full bg-primary transition-opacity", pending ? "animate-pulse opacity-100" : "opacity-0")}
    />
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex lg:gap-2">
          {NAV_LINKS.map((link) => {
            const active = isCurrent(pathname, link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative rounded-full px-3 py-2 text-sm transition-colors duration-200",
                  active
                    ? "bg-primary-light font-semibold text-primary"
                    : "font-medium text-body hover:bg-primary-light/60 hover:text-primary"
                )}
              >
                {link.label}
                <Underline active={active} />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            href="/login"
            variant="outline"
            aria-current={pathname === "/login" ? "page" : undefined}
            className={cn(
              "hover:border-primary-border hover:text-primary",
              pathname === "/login" && "border-primary text-primary"
            )}
          >
            Login
          </Button>
          <Button
            href="/for-creators/apply/profile"
            variant="primary"
            className="transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30"
          >
            Become a Creator
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-heading transition-colors hover:border-primary-border hover:text-primary md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = isCurrent(pathname, link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-lg border-l-4 px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary-light font-semibold text-primary"
                      : "border-transparent font-medium text-body hover:bg-surface-alt hover:text-primary"
                  )}
                >
                  {link.label}
                  <PendingDot />
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <Button href="/login" variant="outline" onClick={() => setOpen(false)}>
              Login
            </Button>
            <Button href="/for-creators/apply/profile" variant="primary" onClick={() => setOpen(false)}>
              Become a Creator
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
