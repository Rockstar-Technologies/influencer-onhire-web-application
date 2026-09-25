import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CampaignStatus, PostCampaignGuide } from "@/types/campaign";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  pending_review: "bg-warning/10 text-warning",
  accepted: "bg-primary-light text-primary",
  in_progress: "bg-success/10 text-success",
};

function CircleCheckIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-success" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="shrink-0 text-muted transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-bold text-heading">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[13px] leading-snug text-body">
          <CircleCheckIcon />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PostCampaignSidebar({ guide }: { guide: PostCampaignGuide }) {
  return (
    <aside className="flex flex-col gap-5">
      <SidebarCard title="What Happens Next?">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {guide.statusFlow.map((step, index) => (
            <li key={step.status} className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_STYLES[step.status])}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {step.label}
              </span>
              {index < guide.statusFlow.length - 1 && (
                <span aria-hidden className="text-muted">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] leading-snug text-body">{guide.nextStepsNote}</p>
      </SidebarCard>

      <SidebarCard title="Smart Matching">
        <CheckList items={guide.smartMatching} />
        <Link
          href="/coming-soon?title=Browse+Influencers"
          className="mt-3 inline-block text-[13px] font-semibold text-primary hover:text-primary-hover"
        >
          See who this campaign would reach →
        </Link>
      </SidebarCard>

      <SidebarCard title="Secure by Design">
        <CheckList items={guide.secureByDesign} />
      </SidebarCard>

      <SidebarCard title="Need Help?">
        <div className="flex flex-col gap-2">
          {guide.faqs.map((faq) => (
            <details key={faq.question} className="group rounded-xl border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-[13px] font-medium text-heading [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronIcon />
              </summary>
              <p className="px-3.5 pb-3 text-[13px] leading-snug text-body">{faq.answer}</p>
            </details>
          ))}
        </div>
      </SidebarCard>
    </aside>
  );
}
