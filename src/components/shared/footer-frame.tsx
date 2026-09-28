"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { COMPACT_FOOTER_PATHS } from "@/constants/design-tokens";
import { cn } from "@/lib/utils";

// Picks the full or slim footer layout for the current route. The content
// itself is rendered by the server-side <Footer /> and passed in as slots.
export function FooterFrame({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  const compact = COMPACT_FOOTER_PATHS.includes(usePathname());

  return (
    <footer className="bg-[#0b1220] text-slate-300">
      <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", compact ? "py-6" : "py-10")}>
        {!compact && top}
        <div
          className={cn(
            "flex flex-col gap-4 text-slate-400 sm:flex-row sm:items-center sm:justify-between",
            compact ? "text-sm" : "mt-8 border-t border-white/10 pt-6 text-xs"
          )}
        >
          {bottom}
        </div>
      </div>
    </footer>
  );
}
