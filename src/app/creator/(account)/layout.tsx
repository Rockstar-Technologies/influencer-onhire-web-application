import type { ReactNode } from "react";
import { AccountShell } from "@/features/account/account-shell";
import { requireCreator } from "@/lib/auth/session";

export default async function Layout({ children }: { children: ReactNode }) {
  return <AccountShell account={(await requireCreator("/creator/payments")).user}>{children}</AccountShell>;
}
