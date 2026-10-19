"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { DeliveryReport } from "@/components/shared/delivery-report";
import { EscrowBadge } from "@/components/shared/escrow-badge";
import { InfoTip } from "@/components/shared/info-tip";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { EscrowPayment, PaymentSplit } from "@/types/payments";
import type { ActionResult } from "@/types/user-management";
import { ResultMessage } from "../../users/sections/result-message";
import { useAdminAction } from "../../users/use-admin-action";
import { releasePaymentAction } from "../actions";
import { PAYMENT_METHOD_LABELS } from "@/lib/domain/labels";

type Row = EscrowPayment & { split: PaymentSplit };

function waitingLabel(requestedAt: string) {
  const days = Math.floor((Date.now() - new Date(requestedAt).getTime()) / (24 * 60 * 60_000));
  return days < 1 ? "Requested today" : `Waiting ${days} ${days === 1 ? "day" : "days"} for release`;
}

export function PaymentTable({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const { pending, run } = useAdminAction();

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function release(id: string) {
    run(async () => {
      const outcome = await releasePaymentAction(id);
      setNotice(outcome);
      setConfirming(null);
      return outcome;
    });
  }

  const total = (part: keyof PaymentSplit) => rows.reduce((sum, row) => sum + row.split[part], 0);
  const th = "px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-muted whitespace-nowrap";

  return (
    <>
      <ResultMessage result={notice} className="mt-4 min-h-4" />
      {/* Bottom padding gives header tooltips room inside the scroll container. */}
      <div className="relative -mb-24 mt-2 overflow-x-auto pb-24">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={th}>Invoice</th>
              <th scope="col" className={th}>Brand → Creator</th>
              <th scope="col" className={th}>Campaign</th>
              <th scope="col" className={cn(th, "text-right")}>
                Gross deposit
                <InfoTip id="tip-gross">The full amount the brand paid into escrow. This is the only figure the brand sees.</InfoTip>
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Platform earnings
                <InfoTip id="tip-fee">The 20% service fee. It counts as revenue once the payment is released; until then it shows as pending.</InfoTip>
              </th>
              <th scope="col" className={cn(th, "text-right")}>Net payout</th>
              <th scope="col" className={th}>Escrow status</th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const isOpen = open.has(row.id);
              const unreleased = row.status !== "released";
              return (
                <Fragment key={row.id}>
                  <tr className="transition-colors hover:bg-surface-alt">
                    <td className="whitespace-nowrap px-2 py-3.5">
                      <span className="block font-semibold text-heading">{row.invoice}</span>
                      <span className="block text-xs text-muted">{PAYMENT_METHOD_LABELS[row.method]}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3.5">
                      <Link href={`/admin/users/${row.brand.id}`} className="block text-heading hover:text-navy hover:underline">
                        {row.brand.name}
                      </Link>
                      <Link href={`/admin/users/${row.creator.id}`} className="block text-xs text-muted hover:text-navy hover:underline">
                        → {row.creator.name}
                      </Link>
                    </td>
                    <td className="min-w-32 px-2 py-3.5 text-heading">{row.campaign}</td>
                    <td className="whitespace-nowrap px-2 py-3.5 text-right font-semibold tabular-nums text-heading">{formatPrice(row.split.gross)}</td>
                    <td className="whitespace-nowrap px-2 py-3.5 text-right tabular-nums">
                      <span className={unreleased ? "text-muted" : "font-semibold text-success-strong"}>{formatPrice(row.split.fee)}</span>
                      {unreleased && <span className="block text-xs text-muted">pending</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3.5 text-right font-semibold tabular-nums text-heading">{formatPrice(row.split.net)}</td>
                    <td className="px-2 py-3.5">
                      <EscrowBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-3.5">
                      {row.status === "requested" && confirming === row.id ? (
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="text-xs font-medium text-heading">Send {formatPrice(row.split.net)}?</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => release(row.id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-hover disabled:cursor-wait disabled:opacity-70"
                            >
                              {pending && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
                              Confirm
                            </button>
                            <button type="button" onClick={() => setConfirming(null)} className="text-xs font-semibold text-muted hover:text-heading">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {row.status === "requested" && (
                            <button
                              type="button"
                              onClick={() => setConfirming(row.id)}
                              className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-navy-hover"
                            >
                              Release
                            </button>
                          )}
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={`payment-${row.id}`}
                            onClick={() => toggle(row.id)}
                            aria-label={`${isOpen ? "Hide" : "Show"} ${row.status === "released" ? "receipt" : "details"} for ${row.invoice}`}
                            title={row.status === "released" ? "Receipt" : "Details"}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-heading hover:border-navy/30 hover:text-navy"
                          >
                            <FiChevronDown className={cn("transition-transform", isOpen && "rotate-180")} aria-hidden />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr id={`payment-${row.id}`} className="bg-surface-alt">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Split</p>
                            <dl className="space-y-1.5 text-sm tabular-nums">
                              <div className="flex justify-between gap-4">
                                <dt className="text-body">Gross deposit (brand paid)</dt>
                                <dd className="text-heading">{formatPrice(row.split.gross)}</dd>
                              </div>
                              <div className="flex justify-between gap-4 text-danger-strong">
                                <dt>Platform service fee (20%)</dt>
                                <dd>−{formatPrice(row.split.fee)}</dd>
                              </div>
                              <div className="flex justify-between gap-4 border-t border-dashed border-border pt-1.5 font-semibold text-heading">
                                <dt>Net payout to creator</dt>
                                <dd>{formatPrice(row.split.net)}</dd>
                              </div>
                            </dl>
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Timeline</p>
                            <dl className="space-y-1.5 text-sm">
                              <div className="flex justify-between gap-4">
                                <dt className="text-body">Funded</dt>
                                <dd className="text-heading">{formatDate(row.fundedAt)}</dd>
                              </div>
                              <div className="flex justify-between gap-4">
                                <dt className="text-body">Payout requested</dt>
                                <dd className="text-heading">{row.requestedAt ? formatDate(row.requestedAt) : "Not yet"}</dd>
                              </div>
                              <div className="flex justify-between gap-4">
                                <dt className="text-body">Released</dt>
                                <dd className="text-heading">{row.releasedAt ? formatDate(row.releasedAt) : "Not yet"}</dd>
                              </div>
                            </dl>
                            {row.status === "requested" && row.requestedAt && (
                              <p className="mt-2 text-xs font-medium text-warning">{waitingLabel(row.requestedAt)}</p>
                            )}
                          </div>
                          {row.report ? (
                            <div className="sm:col-span-2">
                              <DeliveryReport report={row.report} />
                            </div>
                          ) : (
                            <p className="text-sm text-muted sm:col-span-2">No delivery report yet. The creator submits one when they request cashout.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold text-heading">
              <td colSpan={3} className="px-2 py-3.5">
                Totals · {rows.length} {rows.length === 1 ? "payment" : "payments"}
              </td>
              <td className="whitespace-nowrap px-2 py-3.5 text-right tabular-nums">{formatPrice(total("gross"))}</td>
              <td className="whitespace-nowrap px-2 py-3.5 text-right tabular-nums">{formatPrice(total("fee"))}</td>
              <td className="whitespace-nowrap px-2 py-3.5 text-right tabular-nums">{formatPrice(total("net"))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
