import type { ReactNode } from "react";

function CheckIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-primary-border" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Split card shared by the sign-up and sign-in pages: navy intro panel on the left, form on the right.
export function AuthShell({
  eyebrow,
  title,
  body,
  perks,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  perks: string[];
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-start justify-center bg-surface-alt px-4 py-10 sm:py-16">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:grid-cols-[0.9fr_1.1fr]">
        <aside className="bg-[#0b1220] p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-border">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{body}</p>
          <ul className="mt-8 flex flex-col gap-3">
            {perks.map((perk) => (
              <li key={perk} className="flex gap-2.5 text-sm text-slate-200">
                <CheckIcon />
                {perk}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
