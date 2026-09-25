import { cn } from "@/lib/utils";
import type { EscrowStep } from "@/types/payment";

// Each stage gets a soft tint of its badge color so the three steps read apart at a glance.
const STEP_STYLES = [
  { badge: "bg-heading text-white", tint: "bg-heading/[0.06]" },
  { badge: "bg-primary text-white", tint: "bg-primary-light" },
  { badge: "bg-success text-white", tint: "bg-success/10" },
];

export function EscrowSteps({ steps }: { steps: EscrowStep[] }) {
  return (
    <ol className="grid overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-sm md:grid-cols-3">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={cn(
            "relative flex gap-3.5 p-5",
            STEP_STYLES[index % STEP_STYLES.length].tint,
            index > 0 && "border-t border-border md:border-l md:border-t-0"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              STEP_STYLES[index % STEP_STYLES.length].badge
            )}
          >
            {index + 1}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-heading">{step.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-body">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
