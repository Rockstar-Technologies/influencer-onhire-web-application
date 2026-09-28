import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6", className)}>
      <h2 className="text-base font-bold text-heading">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
