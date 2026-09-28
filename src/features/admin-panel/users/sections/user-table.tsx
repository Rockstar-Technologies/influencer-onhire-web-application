"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FiCheck, FiChevronRight, FiFlag, FiMail, FiRotateCcw, FiSlash, FiX } from "react-icons/fi";
import { cn, formatCount, formatPrice, initials } from "@/lib/utils";
import type { ActionResult, BulkAction, PlatformUser } from "@/types/user-management";
import { toggleFlagAction, userStatusAction } from "../actions";
import { useAdminAction } from "../use-admin-action";
import { MessageDialog } from "./message-dialog";
import { ResultMessage } from "./result-message";
import { AccountStatusBadge, AccountTypeTag, ComplianceIndicator } from "./user-badges";

const COLUMNS = ["User", "Location · Niche", "Audience", "Wallet", "Documents", "Status", "Quick actions"];

function IconButton({
  label,
  onClick,
  disabled,
  tone = "neutral",
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "good" | "bad";
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-50",
        tone === "good" && "border-success/30 text-success-strong hover:bg-success-light",
        tone === "bad" && "border-danger/30 text-danger-strong hover:bg-danger-light",
        tone === "neutral" && "border-border text-body hover:bg-surface-alt hover:text-heading",
        pressed && "border-warning/40 bg-warning-light text-warning",
      )}
    >
      {children}
    </button>
  );
}

export function UserTable({ users }: { users: PlatformUser[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [messageTo, setMessageTo] = useState<PlatformUser[] | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const { pending, run } = useAdminAction();
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Filtering can hide selected rows; only ever act on what the admin can still see.
  const visibleSelected = users.filter((user) => selected.has(user.id));
  const allSelected = users.length > 0 && visibleSelected.length === users.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = visibleSelected.length > 0 && !allSelected;
  }, [visibleSelected.length, allSelected]);

  // Bulk results and "message sent" share one status line, so both write to `notice`.
  function act(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    run(async () => {
      const outcome = await action();
      setNotice(outcome);
      return outcome;
    }, onSuccess);
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(users.map((user) => user.id)));
  }

  function changeStatus(ids: string[], action: BulkAction) {
    act(() => userStatusAction(ids, action), () => setSelected(new Set()));
  }

  const bulkButtons: { action: BulkAction; label: string }[] = [
    { action: "approve", label: "Approve" },
    { action: "reject", label: "Reject" },
    { action: "suspend", label: "Suspend" },
    { action: "reactivate", label: "Reactivate" },
  ];

  return (
    <>
      <div
        className={cn(
          "mt-1 flex min-h-12 flex-wrap items-center gap-2 rounded-xl px-3 py-2 transition-colors",
          visibleSelected.length > 0 ? "bg-info-light" : "bg-transparent",
        )}
      >
        {visibleSelected.length > 0 ? (
          <>
            <span className="mr-2 text-sm font-semibold text-navy">{visibleSelected.length} selected</span>
            {bulkButtons.map(({ action, label }) => (
              <button
                key={action}
                type="button"
                disabled={pending}
                onClick={() => changeStatus(visibleSelected.map((user) => user.id), action)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-heading hover:border-navy hover:text-navy disabled:opacity-60"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMessageTo(visibleSelected)}
              className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-hover"
            >
              <FiMail aria-hidden /> Message
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs font-semibold text-muted hover:text-heading">
              Clear selection
            </button>
          </>
        ) : (
          <span className="text-sm text-muted">Select users to approve, suspend or message several at once.</span>
        )}
        <ResultMessage result={notice} className="w-full" />
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-10 px-4 pb-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all users"
                  className="h-4 w-4 accent-navy"
                />
              </th>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-4 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              const isSelected = selected.has(user.id);
              return (
                <tr key={user.id} className={cn("transition-colors", isSelected ? "bg-info-light/50" : "hover:bg-surface-alt")}>
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(user.id)}
                      aria-label={`Select ${user.name}`}
                      className="h-4 w-4 accent-navy"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-light text-xs font-bold text-navy">
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/users/${user.id}`} className="font-semibold text-heading hover:text-navy hover:underline">
                            {user.name}
                          </Link>
                          {user.flagged && <FiFlag className="shrink-0 text-warning" aria-label="Flagged for review" />}
                        </div>
                        <span className="block truncate text-xs text-muted">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="block text-heading">{user.location}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <AccountTypeTag type={user.type} /> {user.niche}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {user.followers === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <>
                        <span className="block font-semibold text-heading">{formatCount(user.followers)}</span>
                        <span className="block text-xs text-muted">{user.engagementRate}% engagement</span>
                      </>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="block text-heading">{formatPrice(user.wallet.available)}</span>
                    <span className="block text-xs text-muted">{formatPrice(user.wallet.inEscrow)} in escrow</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ComplianceIndicator status={user.compliance} />
                  </td>
                  <td className="px-4 py-3.5">
                    <AccountStatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {user.status === "pending" && (
                        <>
                          <IconButton label={`Approve ${user.name}`} tone="good" disabled={pending} onClick={() => changeStatus([user.id], "approve")}>
                            <FiCheck />
                          </IconButton>
                          <IconButton label={`Reject ${user.name}`} tone="bad" disabled={pending} onClick={() => changeStatus([user.id], "reject")}>
                            <FiX />
                          </IconButton>
                        </>
                      )}
                      {user.status === "active" && (
                        <IconButton label={`Suspend ${user.name}`} tone="bad" disabled={pending} onClick={() => changeStatus([user.id], "suspend")}>
                          <FiSlash />
                        </IconButton>
                      )}
                      {(user.status === "suspended" || user.status === "rejected") && (
                        <IconButton label={`Reactivate ${user.name}`} tone="good" disabled={pending} onClick={() => changeStatus([user.id], "reactivate")}>
                          <FiRotateCcw />
                        </IconButton>
                      )}
                      <IconButton
                        label={user.flagged ? `Remove flag from ${user.name}` : `Flag ${user.name} for review`}
                        pressed={user.flagged}
                        disabled={pending}
                        onClick={() => act(() => toggleFlagAction(user.id, !user.flagged))}
                      >
                        <FiFlag />
                      </IconButton>
                      <IconButton label={`Message ${user.name}`} onClick={() => setMessageTo([user])}>
                        <FiMail />
                      </IconButton>
                      <Link
                        href={`/admin/users/${user.id}`}
                        aria-label={`Open ${user.name}'s profile`}
                        title="Open profile"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-alt hover:text-navy"
                      >
                        <FiChevronRight />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MessageDialog
        recipients={messageTo}
        onClose={() => setMessageTo(null)}
        onSent={(message) => {
          setNotice({ ok: true, message });
          setSelected(new Set());
        }}
      />
    </>
  );
}
