"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminFailureNotice } from "./failure";
import type { AdminFailure, FailureNotice } from "./failure";

export interface DecisionAction {
  kind: string;
  label: string;
  tone: "primary" | "danger" | "neutral";
  /** What the administrator may write with this decision. */
  text: "none" | "optional" | "required";
  textLabel?: string;
  textHelp?: string;
  min?: number;
  max?: number;
  singleLine?: boolean;
  /** Asked before anything is sent. */
  confirm?: string;
  done: string;
}

export type DecisionResult = { ok: true; status: string } | { ok: false; error: AdminFailure };

interface Props {
  actions: DecisionAction[];
  returnTo: string;
  /** Runs the decision through the Server Action. */
  submit: (kind: string, text: string) => Promise<DecisionResult>;
  emptyText: string;
}

const TONE = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  danger: "border border-danger/40 text-danger hover:bg-danger-light",
  neutral: "border border-border text-heading hover:bg-surface-alt",
} as const;

/**
 * The buttons for an administrator's decision on one record, with the words they may add. The record's real state decides which buttons exist; the API
 * decides whether the decision is allowed. A result is shown only after the API confirmed it, and the page is then refreshed from the API.
 */
export function DecisionPanel({ actions, returnTo, submit, emptyText }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<DecisionAction | null>(null);
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const inFlight = useRef(false);

  function choose(action: DecisionAction) {
    setOpen(action);
    setText("");
    setProblem(null);
    setNotice(null);
  }

  async function confirm() {
    if (!open || inFlight.current) return; // one decision at a time; a double click must not send two
    const trimmed = text.trim();
    if (open.text === "required" && trimmed.length < (open.min ?? 1)) return setProblem(`Write at least ${open.min ?? 1} characters.`);
    if (trimmed && open.min && trimmed.length < open.min) return setProblem(`Write at least ${open.min} characters.`);
    if (open.max && trimmed.length > open.max) return setProblem(`Keep it under ${open.max} characters.`);
    if (open.singleLine && /[\r\n]/.test(trimmed)) return setProblem("Use a single line.");
    if (open.confirm && !window.confirm(open.confirm)) return;
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    setNotice(null);
    try {
      const result = await submit(open.kind, trimmed);
      if (result.ok) {
        setDone(open.done);
        setOpen(null);
        router.refresh(); // show what the API now holds
        return;
      }
      setNotice(adminFailureNotice(result.error, returnTo));
      if (result.error.kind === "conflict" || result.error.kind === "not_found") router.refresh();
    } catch {
      setNotice(adminFailureNotice({ kind: "unavailable", requestId: null }, returnTo));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {done && (
        <p role="status" className="rounded-xl border border-success/30 bg-success-light px-4 py-3 text-sm font-medium text-success-strong">
          {done}
        </p>
      )}
      {!open && actions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <button key={action.kind} type="button" disabled={busy} onClick={() => choose(action)} className={cn("rounded-lg px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60", TONE[action.tone])}>
              {action.label}
            </button>
          ))}
        </div>
      )}
      {!open && actions.length === 0 && !done && <p className="text-sm text-muted">{emptyText}</p>}

      {open && (
        <div className="space-y-3 rounded-xl border border-border bg-surface-alt p-4">
          <h3 className="text-sm font-bold text-heading">{open.label}</h3>
          {open.text !== "none" && (
            <div>
              <label htmlFor="decision-text" className="text-sm font-semibold text-heading">
                {open.textLabel ?? "Note"} {open.text === "optional" && <span className="font-normal text-muted">(optional)</span>}
              </label>
              <textarea
                id="decision-text"
                rows={open.singleLine ? 2 : 4}
                value={text}
                onChange={(event) => setText(event.target.value)}
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? "decision-text-error" : open.textHelp ? "decision-text-help" : undefined}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              {open.textHelp && !problem && (
                <p id="decision-text-help" className="mt-1 text-xs text-muted">
                  {open.textHelp}
                </p>
              )}
              {problem && (
                <p id="decision-text-error" className="mt-1 text-xs font-medium text-danger">
                  {problem}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void confirm()} className={cn("rounded-lg px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60", open.tone === "danger" ? "bg-danger text-white hover:opacity-90" : TONE.primary)}>
              {busy ? "Working…" : `Confirm: ${open.label}`}
            </button>
            <button type="button" disabled={busy} onClick={() => setOpen(null)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-heading hover:bg-surface disabled:opacity-60">
              Cancel
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p role="alert" className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
          {notice.text}
          {notice.link && (
            <>
              {" "}
              <Link href={notice.link.href} className="font-semibold underline">
                {notice.link.label}
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
