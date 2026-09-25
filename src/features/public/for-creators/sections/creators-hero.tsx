import type { ReactNode } from "react";
import type { ForCreatorsContent } from "@/types/creator-application";

function CheckIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-primary-border" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CreatorsHero({ hero, application }: { hero: ForCreatorsContent["hero"]; application: ReactNode }) {
  return (
    <section className="bg-[#0b1220] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-border">{hero.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">{hero.title}</h1>
          <p className="mt-4 max-w-lg leading-relaxed text-slate-300">{hero.body}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {hero.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-2.5 text-sm text-slate-200">
                <CheckIcon />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        {application}
      </div>
    </section>
  );
}
