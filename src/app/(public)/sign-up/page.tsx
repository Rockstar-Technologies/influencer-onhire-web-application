import type { Metadata } from "next";
import { SignUpPage } from "@/features/public/sign-up/sign-up-page";

export const metadata: Metadata = {
  title: "Sign Up | Influencer On Hire",
};

export default function Page() {
  return <SignUpPage />;
}
