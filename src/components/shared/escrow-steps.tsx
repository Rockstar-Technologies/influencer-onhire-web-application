import { cn } from "@/lib/utils";

// Pay → hold → release is a fixed sequence, so the numbers carry meaning. Wording changes per audience.
const TONES = ["bg-info-light text-navy", "bg-info-light text-info", "bg-success-light text-success-strong"];

export function EscrowSteps({ steps }: { steps: Array<{ title: string } & ({ body: string } | { description: string })> }) {
  return (
    <ol className="grid gap-3 lg:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", TONES[index % TONES.length])}>
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-heading">{step.title}</p>
            <p className="mt-0.5 text-sm text-body">{"body" in step ? step.body : step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
