"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitDeliveryReportAction } from "./actions";
import { paymentFailureNotice } from "./failure";
import type { FailureNotice } from "./failure";
import { LIMITS, checkLinks, checkWords } from "./schemas";

/** Delivery report for one held payment. The report can never be edited once sent, so the form says so and asks for confirmation. */
export function DeliveryReportForm({ paymentId, returnTo }: { paymentId: string; returnTo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [links, setLinks] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);

  async function send() {
    if (inFlight.current) return;
    const s = checkWords(summary, LIMITS.summary);
    if (!s.ok) return setProblem(s.message);
    const l = checkLinks(links.split(/\s*\n\s*/));
    if (!l.ok) return setProblem(l.message);
    if (!window.confirm("Send this delivery report? It can't be changed afterwards.")) return;
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    setNotice(null);
    try {
      const result = await submitDeliveryReportAction({ id: paymentId, summary: s.value, links: l.links });
      if (result.ok) {
        setDone(true);
        setOpen(false);
        router.refresh();
      } else setNotice(paymentFailureNotice(result.error, returnTo));
    } catch {
      setNotice(paymentFailureNotice({ kind: "unavailable", requestId: null }, returnTo));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (done) return <p role="status" className="text-sm font-medium text-success-strong">Delivery report sent. This is a request for release, not a payment.</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
        Submit delivery report
      </button>
    );
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-alt p-4">
      <div>
        <label htmlFor={`summary-${paymentId}`} className="text-sm font-semibold text-heading">What did you deliver?</label>
        <textarea id={`summary-${paymentId}`} value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={LIMITS.summary.max} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm" />
      </div>
      <div>
        <label htmlFor={`links-${paymentId}`} className="text-sm font-semibold text-heading">Links to your posts (one per line, up to {LIMITS.maxLinks})</label>
        <textarea id={`links-${paymentId}`} value={links} onChange={(e) => setLinks(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm" />
      </div>
      {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
      {notice && (
        <p role="alert" className="text-sm text-danger">
          {notice.text} {notice.link && <a href={notice.link.href} className="font-semibold underline">{notice.link.label}</a>}
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={send} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
          {busy ? "Sending…" : "Send report"}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-heading">Cancel</button>
      </div>
    </div>
  );
}
