"use client";

import { resolveFlagAction } from "../actions";
import { useAdminAction } from "../use-admin-action";
import { ResultMessage } from "./result-message";

export function ModerationActions({ flagId }: { flagId: string }) {
  const { pending, result, run } = useAdminAction();

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => resolveFlagAction(flagId, "remove"))}
        className="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger-strong disabled:opacity-60"
      >
        Remove content
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => resolveFlagAction(flagId, "dismiss"))}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-heading hover:bg-surface-alt disabled:opacity-60"
      >
        Keep it
      </button>
      <ResultMessage result={result} />
    </div>
  );
}
