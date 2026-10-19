"use client";

import { Fragment, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { DeliveryReport } from "@/components/shared/delivery-report";
import { EscrowBadge } from "@/components/shared/escrow-badge";
import { InfoTip } from "@/components/shared/info-tip";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { BrandPaymentView } from "@/types/payments";
import { PAYMENT_METHOD_LABELS } from "@/lib/domain/labels";

const STATUS_NOTE: Record<BrandPaymentView["status"], string> = {
  held: "Your deposit is held safely in escrow. The creator can see it's on hold and is working on the campaign.",
  requested: "The creator has delivered and requested cashout. The platform is reviewing their report before releasing your deposit.",
  released: "Your deposit has been released to the creator. This campaign is complete.",
  refund_pending: "A refund of this payment is being processed.",
  refunded: "This payment was refunded.",
};

const ACTION_LABEL: Record<BrandPaymentView["status"], string> = {
  held: "Details",
  requested: "Read report",
  released: "Receipt",
  refund_pending: "Details",
  refunded: "Details",
};

export function BrandPaymentTable({ payments }: { payments: BrandPaymentView[] }) {
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
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={th}>Campaign</th>
            <th scope="col" className={th}>Creator</th>
            <th scope="col" className={cn(th, "text-right")}>
              Total deposited
              <InfoTip id="tip-brand-deposit">Funds are completely secure. Your 100% deposit is held safely until the work is delivered and confirmed.</InfoTip>
            </th>
            <th scope="col" className={th}>Paid with</th>
            <th scope="col" className={th}>Date funded</th>
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
                    <span className="block text-xs text-muted">{payment.invoice}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-heading">{payment.creatorName}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold tabular-nums text-heading">{formatPrice(payment.deposited)}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-body">{PAYMENT_METHOD_LABELS[payment.method]}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-body">{formatDate(payment.fundedAt)}</td>
                  <td className="px-3 py-3.5">
                    <EscrowBadge status={payment.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`brand-payment-${payment.id}`}
                      onClick={() => toggle(payment.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        payment.status === "requested"
                          ? "border-navy bg-navy text-white hover:bg-navy-hover"
                          : "border-border text-heading hover:border-navy/30 hover:text-navy",
                      )}
                    >
                      {ACTION_LABEL[payment.status]}
                      <FiChevronDown className={cn("transition-transform", isOpen && "rotate-180")} aria-hidden />
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr id={`brand-payment-${payment.id}`} className="bg-surface-alt">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid gap-6 lg:max-w-4xl lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
                          <dl className="space-y-1.5 text-sm">
                            <div className="flex justify-between gap-4">
                              <dt className="text-body">Deposited</dt>
                              <dd className="font-semibold tabular-nums text-heading">{formatPrice(payment.deposited)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-body">Funded</dt>
                              <dd className="text-heading">{formatDate(payment.fundedAt)}</dd>
                            </div>
                            {payment.releasedAt && (
                              <div className="flex justify-between gap-4">
                                <dt className="text-body">Released</dt>
                                <dd className="text-heading">{formatDate(payment.releasedAt)}</dd>
                              </div>
                            )}
                          </dl>
                          <p className="mt-3 text-sm text-body">{STATUS_NOTE[payment.status]}</p>
                        </div>
                        {payment.report ? (
                          <DeliveryReport report={payment.report} />
                        ) : (
                          <p className="text-sm text-muted">The creator&apos;s delivery report will appear here when they finish the campaign.</p>
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
