import type { ReactNode } from "react";

// Re-mounts on every navigation, so each new page fades in and the visitor
// clearly notices they've moved to a different page.
export default function PublicTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-page-enter flex flex-1 flex-col">{children}</div>;
}
