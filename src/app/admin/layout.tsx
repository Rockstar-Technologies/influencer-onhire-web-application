import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin-panel/admin-shell";
import { requireAdmin } from "@/lib/auth/session";

export default async function Layout({ children }: { children: ReactNode }) {
  // Administrators only. Each page and action repeats its own check (layouts do not re-run on client-side navigation) and the API enforces
  // every permission again on each call.
  const { user } = await requireAdmin("/admin");
  return <AdminShell admin={user}>{children}</AdminShell>;
}
