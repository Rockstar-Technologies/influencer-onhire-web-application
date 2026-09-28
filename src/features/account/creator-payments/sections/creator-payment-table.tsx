"use client";

import { Fragment, useState } from "react";
import { FiCheckCircle, FiChevronDown, FiClock } from "react-icons/fi";
import { DeliveryReport } from "@/components/shared/delivery-report";
import { EscrowBadge } from "@/components/shared/escrow-badge";
import { InfoTip } from "@/components/shared/info-tip";
import { cn, formatDate, formatPrice, maskPhone } from "@/lib/utils";
import type { CreatorPaymentView } from "@/types/payments";
import { CashoutDialog } from "./cashout-dialog";

export function CreatorPaymentTable({ payments }: { payments: CreatorPaymentView[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const th = "px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-muted whitespace-nowrap";

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative -mb-24 overflow-x-auto pb-24">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={th}>Campaign</th>
            <th scope="col" className={th}>Brand</th>
            <th scope="col" className={cn(th, "text-right")}>
              Your earnings (net)
              <InfoTip id="tip-creator-net">Your take-home pay after the 20% platform service fee. It&apos;s locked for you as soon as the brand pays.</InfoTip>
            </th>
            <th scope="col" className={th}>Escrow status</th>
            <th scope="col" className={th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((payment) => {
            const isOpen = open.has(payment.id);
            return (
              <Fragment key={payment.id}>
                <tr className="transition-colors hover:bg-surface-alt">
                  <td className="px-3 py-3.5">
                    <span className="block font-semibold text-heading">{payment.campaign}</span>
                    <span className="block text-xs text-muted">
                      {payment.invoice} · funded {formatDate(payment.fundedAt)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-heading">{payment.brandName}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right">
                    <span className="block font-semibold tabular-nums text-heading">{formatPrice(payment.split.net)}</span>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`creator-payment-${payment.id}`}
                      onClick={() => toggle(payment.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                    >
                      {payment.report ? "Details & report" : "Fee breakdown"}
                      <FiChevronDown className={cn("transition-transform", isOpen && "rotate-180")} aria-hidden />
                    </button>
                  </td>
                  <td className="px-3 py-3.5">
                    <EscrowBadge status={payment.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    {payment.status === "held" && <CashoutDialog payment={payment} />}
                    {payment.status === "requested" && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
                        <FiClock aria-hidden /> Awaiting release
                      </span>
                    )}
                    {payment.status === "released" && payment.releasedAt && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success-strong">
                        <FiCheckCircle aria-hidden /> Paid {formatDate(payment.releasedAt)}
                      </span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr id={`creator-payment-${payment.id}`} className="bg-surface-alt">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid gap-6 lg:max-w-4xl lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">How your pay is worked out</p>
                          <dl className="space-y-1.5 text-sm tabular-nums">
                            <div className="flex justify-between gap-4">
                              <dt className="text-body">Gross campaign budget</dt>
                              <dd className="text-heading">{formatPrice(payment.split.gross)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 text-danger-strong">
                              <dt>Platform service fee (20%)</dt>
                              <dd>−{formatPrice(payment.split.fee)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-dashed border-border pt-1.5 font-semibold text-heading">
                              <dt>{payment.status === "released" ? "Paid out to you" : "Guaranteed payout locked"}</dt>
                              <dd>{formatPrice(payment.split.net)}</dd>
                            </div>
                          </dl>
                          {payment.payoutTo && (
                            <p className="mt-3 text-sm text-body">
                              {payment.status === "released" ? "Sent to" : "Will be sent to"}{" "}
                              <span className="font-semibold text-heading">{payment.payoutTo.method}</span>{" "}
                              <span className="tabular-nums">{maskPhone(payment.payoutTo.phone)}</span>
                            </p>
                          )}
                        </div>
                        {payment.report ? (
                          <DeliveryReport report={payment.report} />
                        ) : (
                          <p className="text-sm text-muted">
                            When you&apos;ve finished the campaign, use &ldquo;Submit report &amp; cash out&rdquo; to tell the brand what you delivered and get paid.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
