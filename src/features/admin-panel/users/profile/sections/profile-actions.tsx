"use client";

import { useState } from "react";
import { FiFlag, FiMail } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { ActionResult, BulkAction, PlatformUser } from "@/types/user-management";
import { toggleFlagAction, userStatusAction } from "../../actions";
import { MessageDialog } from "../../sections/message-dialog";
import { ResultMessage } from "../../sections/result-message";
import { useAdminAction } from "../../use-admin-action";

const STATUS_ACTIONS: Record<PlatformUser["status"], { action: BulkAction; label: string; danger?: boolean }[]> = {
  pending: [
    { action: "approve", label: "Approve" },
    { action: "reject", label: "Reject", danger: true },
  ],
  active: [{ action: "suspend", label: "Suspend", danger: true }],
  suspended: [{ action: "reactivate", label: "Reactivate" }],
  rejected: [{ action: "reactivate", label: "Reactivate" }],
};

export function ProfileActions({ user }: { user: PlatformUser }) {
  const { pending, run } = useAdminAction();
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [messaging, setMessaging] = useState(false);

  function act(action: () => Promise<ActionResult>) {
    run(async () => {
      const outcome = await action();
      setNotice(outcome);
      return outcome;
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {STATUS_ACTIONS[user.status].map(({ action, label, danger }) => (
          <button
            key={action}
            type="button"
            disabled={pending}
            onClick={() => act(() => userStatusAction([user.id], action))}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60",
              danger ? "border border-danger/30 text-danger-strong hover:bg-danger-light" : "bg-navy text-white hover:bg-navy-hover",
            )}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          disabled={pending}
          aria-pressed={user.flagged}
          onClick={() => act(() => toggleFlagAction(user.id, !user.flagged))}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60",
            user.flagged ? "border-warning/40 bg-warning-light text-warning" : "border-border text-heading hover:bg-surface-alt",
          )}
        >
          <FiFlag aria-hidden />
          {user.flagged ? "Flagged" : "Flag"}
        </button>
        <button
          type="button"
          onClick={() => setMessaging(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-heading hover:bg-surface-alt"
        >
          <FiMail aria-hidden />
          Message
        </button>
      </div>
      <ResultMessage result={notice} />

      <MessageDialog
        recipients={messaging ? [user] : null}
        onClose={() => setMessaging(false)}
        onSent={(message) => setNotice({ ok: true, message })}
      />
    </div>
  );
}
