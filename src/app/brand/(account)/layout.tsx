import type { ReactNode } from "react";
import { AccountShell } from "@/features/account/account-shell";
import { requireAccount } from "@/services/session.service";

export default async function Layout({ children }: { children: ReactNode }) {
  return <AccountShell account={await requireAccount("brand")}>{children}</AccountShell>;
}
