import type { ReactNode } from "react";
import { requireCreator } from "@/lib/auth/session";

// The application is for signed-in creators (pending ones included): everyone else is sent to sign in or to their own area.
export default async function Layout({ children }: { children: ReactNode }) {
  await requireCreator("/for-creators/apply/profile", { allowPending: true });
  return children;
}
