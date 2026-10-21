import { PASSWORD_MIN_LENGTH } from "@/lib/auth/rules";
import { AuthShell } from "../auth/auth-shell";
import { SignUpForm } from "./sections/sign-up-form";

export function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Join Influencer On Hire"
      title="Create your free account"
      body="One account to hire Cameroon's creators — or to get hired as one."
      perks={[
        "Free to join — no card needed",
        "Payments protected by escrow",
        "Pay and get paid with MTN MoMo or Orange Money",
      ]}
    >
      <SignUpForm minPasswordLength={PASSWORD_MIN_LENGTH} />
    </AuthShell>
  );
}
