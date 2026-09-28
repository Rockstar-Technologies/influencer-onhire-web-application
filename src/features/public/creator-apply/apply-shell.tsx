import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const APPLY_STEPS = [
  { id: "profile", label: "About you", href: "/for-creators/apply/profile" },
  { id: "audience", label: "Audience & work", href: "/for-creators/apply/audience" },
  { id: "rates", label: "Rates & payment", href: "/for-creators/apply/rates" },
] as const;

export type ApplyStepId = (typeof APPLY_STEPS)[number]["id"];

// Page frame shared by the three sign-up steps: title, "Step X of 3" progress, and the step's card.
export function ApplyShell({
  step,
  title,
  description,
  children,
}: {
  step: ApplyStepId;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const current = APPLY_STEPS.findIndex((item) => item.id === step);

  return (
    <div className="flex-1 bg-surface-alt px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Link href="/for-creators" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
          <span aria-hidden>←</span> Back to For Creators
        </Link>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Step {current + 1} of {APPLY_STEPS.length}
          </p>
          <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Sign-up progress">
            {APPLY_STEPS.map((item, index) => (
              <li key={item.id} aria-current={index === current ? "step" : undefined}>
                <span className={cn("block h-1.5 rounded-full", index <= current ? "bg-primary" : "bg-border")} />
                <span
                  className={cn(
                    "mt-2 block text-xs font-medium",
                    index === current ? "text-heading" : index < current ? "text-primary" : "text-muted"
                  )}
                >
                  {index < current ? "✓ " : ""}
                  {item.label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <h1 className="mt-8 text-2xl font-bold text-heading sm:text-3xl">{title}</h1>
        <p className="mt-2 text-body">{description}</p>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">{children}</div>
      </div>
    </div>
  );
}
