import type { ReactNode } from "react";
import { AccountShell } from "@/features/account/account-shell";
import { requireBrand } from "@/lib/auth/session";

export default async function Layout({ children }: { children: ReactNode }) {
  return <AccountShell account={(await requireBrand("/brand/payments")).user}>{children}</AccountShell>;
}
