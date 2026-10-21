import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminHeader({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-heading sm:text-3xl">{title}</h1>
        {text && <p className="mt-2 max-w-3xl text-sm text-body">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function FilterChips({ label, options, current, href }: { label: string; options: { value: string | null; text: string }[]; current: string | null; href: (value: string | null) => string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Link
          key={option.value ?? "all"}
          href={href(option.value)}
          aria-current={current === option.value ? "page" : undefined}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            current === option.value ? "border-navy bg-navy text-white" : "border-border bg-surface text-body hover:border-primary-border hover:text-primary",
          )}
        >
          {option.text}
        </Link>
      ))}
    </nav>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "good" | "wait" | "bad" | "neutral" | "warn" }) {
  const tones = {
    good: "bg-success-light text-success-strong",
    wait: "bg-info-light text-info",
    bad: "bg-danger-light text-danger-strong",
    warn: "bg-warning-light text-warning",
    neutral: "bg-border-light text-body",
  } as const;
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center text-sm text-body">{children}</div>;
}

export function MoreLink({ href }: { href: string }) {
  return (
    <div className="text-center">
      <Link href={href} className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
        Show more
      </Link>
    </div>
  );
}

export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([name, value]) => (
        <div key={name}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{name}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-heading">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      {title && <h2 className="mb-4 font-display text-base font-bold text-heading">{title}</h2>}
      {children}
    </section>
  );
}

/** Builds a list URL from the active filters, leaving out empty ones. */
export function queryHref(base: string, params: Record<string, string | boolean | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== false && value !== "") query.set(key, value === true ? "true" : String(value));
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}
