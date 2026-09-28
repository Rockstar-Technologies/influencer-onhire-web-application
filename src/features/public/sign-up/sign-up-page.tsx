import { getPasswordRules } from "@/services/auth.service";
import { AuthShell } from "../auth/auth-shell";
import { SignUpForm } from "./sections/sign-up-form";

export async function SignUpPage() {
  const { minLength } = await getPasswordRules();

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
      <SignUpForm minPasswordLength={minLength} />
    </AuthShell>
  );
}
