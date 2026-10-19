import type { ReactNode } from "react";
import { Navbar } from "@/components/shared/navbar";
import type { NavbarAccount } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { inter, jakarta } from "@/lib/fonts";
import { homeFor } from "@/lib/auth/paths";
import { getSession } from "@/lib/auth/session";

const HOME_LABEL = { brand: "My dashboard", creator: "My dashboard", admin: "Admin" } as const;

export default async function PublicLayout({ children }: { children: ReactNode }) {
  // The navigation reflects the verified server-side session (never a client-readable value).
  const session = await getSession();
  const account: NavbarAccount | null = session
    ? {
        name: session.user.fullName,
        homeHref: homeFor(session.user),
        homeLabel: session.user.role === "creator" && session.user.status !== "active" ? "Continue application" : HOME_LABEL[session.user.role],
      }
    : null;

  return (
    <div className={`${inter.variable} ${jakarta.variable} flex flex-1 flex-col font-body`}>
      <Navbar account={account} />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
