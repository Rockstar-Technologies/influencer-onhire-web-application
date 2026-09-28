import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Brand pays", body: "The brand deposits the full campaign budget via MTN MoMo or Orange Money.", tone: "bg-info-light text-navy" },
  { title: "Held in escrow", body: "Funds stay on the platform, visible to the brand and the creator on their dashboards.", tone: "bg-info-light text-info" },
  {
    title: "Released on completion",
    body: "When a payout request is approved, 80% goes to the creator and the 20% service fee is booked as platform revenue.",
    tone: "bg-success-light text-success-strong",
  },
];

export function EscrowFlow() {
  return (
    <ol className="grid gap-3 lg:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", step.tone)}>{index + 1}</span>
          <div>
            <p className="text-sm font-semibold text-heading">{step.title}</p>
            <p className="mt-0.5 text-sm text-body">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
