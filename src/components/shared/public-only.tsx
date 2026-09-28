"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Areas with their own top bar: the admin panel and the brand and creator dashboards.
const APP_AREAS = ["/admin", "/brand", "/creator"];

// Hides public-site chrome (navbar, footer) inside those areas.
// TODO: replace with (public) / (app) route groups once the in-progress pages are committed.
export function PublicOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return APP_AREAS.some((area) => pathname.startsWith(area)) ? null : children;
}
