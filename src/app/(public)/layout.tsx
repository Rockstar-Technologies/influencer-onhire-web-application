import type { ReactNode } from "react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { inter, jakarta } from "@/lib/fonts";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.variable} ${jakarta.variable} flex flex-1 flex-col font-body`}>
      <Navbar />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
