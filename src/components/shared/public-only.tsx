"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Hides public-site chrome (navbar, footer) inside the admin panel, which has its own top bar.
// TODO: replace with (public) / admin route groups once the in-progress pages are committed.
export function PublicOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? null : children;
}
