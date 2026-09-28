"use client";

import { dismissAlertAction, userStatusAction } from "../actions";
import { useAdminAction } from "../use-admin-action";
import { ResultMessage } from "./result-message";

export function AlertActions({ alertId, userId }: { alertId: string; userId: string }) {
  const { pending, result, run } = useAdminAction();

  return (
    <div className="flex flex-wrap items-center gap-2 pl-11">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => userStatusAction([userId], "suspend"))}
        className="rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger-strong hover:bg-danger-light disabled:opacity-60"
      >
        Suspend account
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => dismissAlertAction(alertId))}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-heading hover:bg-surface-alt disabled:opacity-60"
      >
        Dismiss
      </button>
      <ResultMessage result={result} />
    </div>
  );
}
