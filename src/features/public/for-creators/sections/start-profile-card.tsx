import Link from "next/link";
import { APPLY_STEPS } from "../../creator-apply/apply-shell";

const STEP_HINTS: Record<(typeof APPLY_STEPS)[number]["id"], string> = {
  profile: "Photo, niche, city and a short bio",
  audience: "Platforms, followers, past work & brand fit",
  rates: "Your prices, contract terms & mobile money",
};

export function StartProfileCard() {
  return (
    <div id="apply" className="scroll-mt-24 rounded-2xl bg-surface p-6 shadow-2xl">
      <h2 className="text-lg font-bold text-heading">Create Your Creator Profile</h2>
      <p className="mt-1 text-sm text-body">
        Three short steps — our team reviews your submission before it goes live.
      </p>

      <ol className="mt-5 flex flex-col gap-3">
        {APPLY_STEPS.map((step, index) => (
          <li key={step.id} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              {index + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold text-heading">{step.label}</span>
              <span className="block text-xs text-muted">{STEP_HINTS[step.id]}</span>
            </span>
          </li>
        ))}
      </ol>

      <Link
        href={APPLY_STEPS[0].href}
        className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
      >
        Start My Profile →
      </Link>
      <p className="mt-2 text-center text-xs text-muted">About 5 minutes · Free to join</p>
    </div>
  );
}
