"use client";

import { useId, useState, type ReactNode } from "react";
import { FiChevronDown } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  title: string;
  // Short line shown under the title while collapsed, e.g. "From 100,000 CFA".
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsiblePanel({ title, summary, defaultOpen = false, children }: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-4 rounded-2xl p-5 text-left sm:p-6"
      >
        <span>
          <span className="block text-base font-bold text-heading">{title}</span>
          <span className="mt-2 block text-sm font-semibold text-primary">{summary}</span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
          <FiChevronDown className={cn("transition-transform duration-200", open && "rotate-180")} />
        </span>
      </button>

      {/* grid-rows 0fr -> 1fr animates height without measuring the content */}
      <div
        id={contentId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="mx-5 border-t border-border pb-5 pt-4 sm:mx-6 sm:pb-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
