"use client";

import { useEffect } from "react";

/** Shown when a page cannot be rendered, for example when the API is unreachable. It never displays error details or upstream data. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Only the opaque digest is logged client-side; messages and stacks may contain internals.
    console.error("page error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-extrabold text-heading">Something went wrong</h1>
      <p className="text-sm text-body">We couldn&apos;t load this page right now. Please try again in a moment.</p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <button type="button" onClick={reset} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
        Try again
      </button>
    </main>
  );
}
