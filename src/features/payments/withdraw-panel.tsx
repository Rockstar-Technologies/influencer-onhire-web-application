"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHOD } from "@/lib/domain/vocabulary";
import type { CreatorWallet, Withdrawal } from "@/lib/api/schemas";
import { formatDate, formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cancelWithdrawalAction, requestWithdrawalAction } from "./actions";
import { paymentFailureNotice } from "./failure";
import type { FailureNotice } from "./failure";
import { METHOD_LABELS, TONE_CLASS, WITHDRAWAL_CANCELLABLE, withdrawalInfo } from "./labels";
import { newWithdrawalKey } from "./schemas";

const RETURN_TO = "/creator/payments";

/**
 * Withdrawal REQUESTS. Only real (non-simulated) balance can be requested. The result says "requested": nothing is paid by this, and no payout provider is
 * connected. The amount, network and a per-attempt Idempotency-Key are the only things sent.
 */
export function WithdrawPanel({ wallet, withdrawals }: { wallet: CreatorWallet; withdrawals: Withdrawal[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("mtn_momo");
  const [key, setKey] = useState(() => newWithdrawalKey());
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const canRequest = wallet.availableXaf >= wallet.minimumWithdrawalXaf;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return; // a double click must not send two
    const value = Number(amount.replace(/[\s,]/g, ""));
    if (!Number.isInteger(value) || value <= 0) return setProblem("Enter the amount in whole FCFA.");
    if (value < wallet.minimumWithdrawalXaf) return setProblem(`The minimum is ${formatFcfa(wallet.minimumWithdrawalXaf)}.`);
    if (value > wallet.availableXaf) return setProblem(`You can request at most ${formatFcfa(wallet.availableXaf)}.`);
    if (!PAYMENT_METHOD.is(method)) return setProblem("Choose MTN MoMo or Orange Money.");
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    setNotice(null);
    setDone(null);
    try {
      const result = await requestWithdrawalAction({ key, amountXaf: value, method });
      if (result.ok) {
        setDone(result.replayed ? "This request was already received." : "Withdrawal requested. It will be reviewed; nothing has been paid yet.");
        setAmount("");
        setKey(newWithdrawalKey()); // the next request is a new intent
        router.refresh();
      } else {
        setNotice(paymentFailureNotice(result.error, RETURN_TO));
        if (result.error.kind !== "unavailable") setKey(newWithdrawalKey());
      }
    } catch {
      setNotice(paymentFailureNotice({ kind: "unavailable", requestId: null }, RETURN_TO)); // same key is kept: a retry cannot duplicate
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="withdraw-heading" className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div>
        <h2 id="withdraw-heading" className="font-display text-base font-bold text-heading">Withdrawals</h2>
        <p className="mt-1 text-sm text-body">
          Withdrawal requests are subject to review. Any applicable fees and estimated processing times will be shown when confirmed. Requesting reserves the amount from your balance; it does not pay you.
        </p>
      </div>

      {canRequest ? (
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <div>
            <label htmlFor="wd-amount" className="text-sm font-semibold text-heading">Amount (FCFA)</label>
            <input id="wd-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-44 rounded-lg border border-border bg-surface p-2 text-sm" />
          </div>
          <div>
            <label htmlFor="wd-method" className="text-sm font-semibold text-heading">Network</label>
            <select id="wd-method" value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 block rounded-lg border border-border bg-surface p-2 text-sm">
              {PAYMENT_METHOD.values.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
            </select>
          </div>
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
            {busy ? "Requesting…" : "Request withdrawal"}
          </button>
        </form>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          {wallet.availableXaf === 0 ? "You have no withdrawable balance." : `Your withdrawable balance is below the minimum of ${formatFcfa(wallet.minimumWithdrawalXaf)}.`}
          {wallet.includesSimulatedFunds && " Simulated (test) balances can't be withdrawn."}
        </p>
      )}
      {canRequest && <p className="text-xs text-muted">It goes to the mobile-money account you registered for that network. Up to {formatFcfa(wallet.availableXaf)} can be requested.</p>}
      {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
      {notice && (
        <p role="alert" className="text-sm text-danger">
          {notice.text} {notice.link && <a href={notice.link.href} className="font-semibold underline">{notice.link.label}</a>}
        </p>
      )}
      {done && <p role="status" className="text-sm font-medium text-success-strong">{done}</p>}

      <WithdrawalList withdrawals={withdrawals} />
    </section>
  );
}

function WithdrawalList({ withdrawals }: { withdrawals: Withdrawal[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const inFlight = useRef(false);

  async function cancel(id: string) {
    if (inFlight.current || !window.confirm("Cancel this withdrawal request? The amount returns to your balance.")) return;
    inFlight.current = true;
    setBusyId(id);
    setNotice(null);
    try {
      const result = await cancelWithdrawalAction({ id });
      if (!result.ok) setNotice(paymentFailureNotice(result.error, RETURN_TO));
      router.refresh();
    } catch {
      setNotice(paymentFailureNotice({ kind: "unavailable", requestId: null }, RETURN_TO));
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  }

  if (withdrawals.length === 0) return <p className="text-sm text-muted">No withdrawal requests yet.</p>;
  return (
    <div className="space-y-3">
      {notice && <p role="alert" className="text-sm text-danger">{notice.text}</p>}
      <ul className="divide-y divide-border">
        {withdrawals.map((w) => {
          const info = withdrawalInfo(w.status);
          return (
            <li key={w.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-heading">
                  {formatFcfa(w.amountXaf)} · {METHOD_LABELS[w.destination.method] ?? w.destination.method}
                  {w.destination.last3 ? ` …${w.destination.last3}` : ""}
                </p>
                <p className="text-xs text-muted">Requested {formatDate(w.requestedAt)}</p>
                <p className="mt-1 text-xs text-body">{info.note}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TONE_CLASS[info.tone])}>{info.label}</span>
                {WITHDRAWAL_CANCELLABLE.has(w.status) && (
                  <button type="button" disabled={busyId !== null} onClick={() => cancel(w.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-heading hover:bg-surface-alt disabled:opacity-60">
                    {busyId === w.id ? "Cancelling…" : "Cancel request"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
