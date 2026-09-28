import { FiAlertCircle, FiBriefcase, FiLock, FiStar } from "react-icons/fi";
import { initials } from "@/lib/utils";
import type { PlatformUser } from "@/types/user-management";
import { signInAction } from "../actions";

const DENIED: Record<string, string> = {
  brand: "That page is only for brand accounts. Sign in as a brand to open it.",
  creator: "That page is only for creator accounts. Sign in as a creator to open it.",
};

function AccountList({ title, icon: Icon, accounts, next }: { title: string; icon: typeof FiStar; accounts: PlatformUser[]; next: string }) {
  return (
    <section aria-labelledby={`${title}-heading`} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 id={`${title}-heading`} className="flex items-center gap-2 font-semibold text-heading">
        <Icon className="text-primary" aria-hidden />
        {title}
      </h2>
      <ul className="mt-4 space-y-2">
        {accounts.map((account) => (
          <li key={account.id}>
            <form action={signInAction}>
              <input type="hidden" name="accountId" value={account.id} />
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary-light"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                  {initials(account.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-heading">{account.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {account.niche} · {account.location}
                  </span>
                </span>
                <span className="text-sm font-semibold text-primary">Sign in</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SignInPage({
  brands,
  creators,
  next,
  denied,
  error,
}: {
  brands: PlatformUser[];
  creators: PlatformUser[];
  next: string;
  denied?: string;
  error?: string;
}) {
  return (
    <div className="bg-surface-alt px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <FiLock size={20} aria-hidden />
          </span>
          <h1 className="mt-4 text-3xl font-bold text-heading">Sign in to your account</h1>
          <p className="mt-2 text-body">Brands and creators each get their own payments dashboard.</p>
        </div>

        {(denied && DENIED[denied]) || error ? (
          <p role="alert" className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-xl bg-danger-light px-4 py-3 text-sm font-medium text-danger-strong">
            <FiAlertCircle className="shrink-0" aria-hidden />
            {error ? "That account can't sign in right now. It may be pending approval or suspended." : DENIED[denied!]}
          </p>
        ) : null}

        <p className="mx-auto mt-6 max-w-xl rounded-xl border border-dashed border-warning/40 bg-warning-light px-4 py-3 text-center text-sm text-warning">
          Demo sign-in: pick an account to preview its dashboard. Real sign-in with a password or phone code replaces this before launch.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <AccountList title="Brands" icon={FiBriefcase} accounts={brands} next={next} />
          <AccountList title="Creators" icon={FiStar} accounts={creators} next={next} />
        </div>
      </div>
    </div>
  );
}
