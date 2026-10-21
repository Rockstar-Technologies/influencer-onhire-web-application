import Link from "next/link";
import { FiArrowRight, FiCheckCircle, FiChevronDown } from "react-icons/fi";
import { Panel } from "@/components/shared/panel";
import { cn } from "@/lib/utils";
import type { CampaignGuidance, CampaignLifecycleStep } from "./guidance";

const TONE_CLASSES: Record<CampaignLifecycleStep["tone"], string> = {
  warning: "bg-warning-light text-warning",
  primary: "bg-primary-light text-primary",
  success: "bg-success-light text-success",
};

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-body">
          <FiCheckCircle className="mt-0.5 shrink-0 text-success" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CampaignSidebar({ guidance }: { guidance: CampaignGuidance }) {
  return (
    <>
      <Panel title="What Happens Next?">
        <ol className="flex flex-wrap items-center gap-2">
          {guidance.lifecycle.map((step, index) => (
            <li key={step.label} className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", TONE_CLASSES[step.tone])}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {step.label}
              </span>
              {index < guidance.lifecycle.length - 1 && <FiArrowRight className="text-muted" aria-hidden />}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-body">{guidance.lifecycleNote}</p>
      </Panel>

      <Panel title="Smart Matching">
        <CheckList items={guidance.smartMatching} />
      </Panel>

      <Panel title="Secure by Design">
        <CheckList items={guidance.securePoints} />
      </Panel>

      <Panel title="Need Help?">
        <div className="space-y-2">
          {guidance.faqs.map((faq) => (
            <details key={faq.question} className="group rounded-full border border-border bg-surface-alt open:rounded-2xl">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-heading [&::-webkit-details-marker]:hidden">
                {faq.question}
                <FiChevronDown className="shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-3 text-sm text-body">{faq.answer}</p>
            </details>
          ))}
        </div>
        <Link href="/contact" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover">
          Talk to support
          <FiArrowRight />
        </Link>
      </Panel>
    </>
  );
}
