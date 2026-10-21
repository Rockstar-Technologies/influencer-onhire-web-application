import Link from "next/link";
import { FiAlertCircle } from "react-icons/fi";
import { signOutAction } from "@/features/auth/actions";
import { homeFor } from "@/lib/auth/paths";
import type { Session } from "@/lib/auth/access";
import { AuthShell } from "../auth/auth-shell";
import { SignInForm } from "./sections/sign-in-form";

const DENIED: Record<string, string> = {
  brand: "That page is only for brand accounts.",
  creator: "That page is only for active creator accounts.",
  admin: "That page is only for administrators.",
};

export function SignInPage({
  email,
  next,
  denied,
  expired,
  session,
}: {
  email?: string;
  next?: string;
  denied?: string;
  expired?: boolean;
  session: Session | null;
}) {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Login to Influencer On Hire"
      body="Pick up where you left off — your campaigns, requests and payments are waiting."
      perks={[
        "Brands: track campaigns and escrow payments",
        "Creators: answer requests and withdraw earnings",
        "Secure payments via MTN MoMo or Orange Money",
      ]}
    >
      {expired && !session && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-heading">
          <FiAlertCircle className="mt-0.5 shrink-0" aria-hidden />
          Your session has ended. Please sign in again.
        </p>
      )}
      {session && denied ? (
        <div className="flex flex-col gap-4" role="alert">
          <p className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <FiAlertCircle className="mt-0.5 shrink-0" aria-hidden />
            {DENIED[denied] ?? "You don't have access to that page."} You are signed in as {session.user.fullName}.
          </p>
          <Link href={homeFor(session.user)} className="text-sm font-semibold text-primary hover:text-primary-hover">
            Go to my account
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="text-sm font-semibold text-primary hover:text-primary-hover">
              Sign out and use a different account
            </button>
          </form>
        </div>
      ) : (
        <SignInForm initialEmail={email} next={next} />
      )}
    </AuthShell>
  );
}
