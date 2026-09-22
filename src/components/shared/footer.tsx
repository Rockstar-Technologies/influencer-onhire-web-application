import Link from "next/link";
import type { ReactNode } from "react";
import { FOOTER_LINKS, LEGAL_LINKS, SOCIAL_LINKS } from "@/constants/design-tokens";

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 3c.4 2.2 1.9 3.7 4.2 3.9v3.1c-1.5.1-2.9-.4-4.2-1.3v6.6c0 3.6-2.9 6.2-6.2 5.9-3-.3-5.1-3-4.7-6 .3-2.6 2.6-4.6 5.3-4.5v3.2c-1.2-.2-2.3.6-2.4 1.8-.1 1.1.7 2.1 1.9 2.2 1.3.1 2.4-.9 2.4-2.2V3h3.7Z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.6 7.6a3 3 0 0 0-2.1-2.1C17.8 5 12 5 12 5s-5.8 0-7.5.5a3 3 0 0 0-2.1 2.1C2 9.3 2 12 2 12s0 2.7.4 4.4a3 3 0 0 0 2.1 2.1C6.2 19 12 19 12 19s5.8 0 7.5-.5a3 3 0 0 0 2.1-2.1c.4-1.7.4-4.4.4-4.4s0-2.7-.4-4.4ZM10 15.2V8.8L15.5 12 10 15.2Z" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<string, ReactNode> = {
  Facebook: <FacebookIcon />,
  Instagram: <InstagramIcon />,
  TikTok: <TikTokIcon />,
  YouTube: <YoutubeIcon />,
};

export function Footer() {
  return (
    <footer className="bg-[#0b1220] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
              IH
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-base font-bold text-white">Influencer</span>
              <span className="text-[11px] font-bold tracking-wide text-primary-border">ON HIRE</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="text-slate-300 transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-primary"
              >
                {SOCIAL_ICONS[social.label]}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Influencer On Hire. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
