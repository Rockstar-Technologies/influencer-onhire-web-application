import { AuthShell } from "../auth/auth-shell";
import { SignInForm } from "./sections/sign-in-form";

export function SignInPage({ email }: { email?: string }) {
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
      <SignInForm initialEmail={email} />
    </AuthShell>
  );
}
