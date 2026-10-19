import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import type { PermissionCode } from "@/lib/domain/vocabulary";
import { formatFcfa } from "@/lib/format";
import { PaymentRelease } from "./decisions";
import { PAYMENT_STATUS_TEXT, dateTime, label } from "./mapping";
import { loadPayment } from "./server";
import { AdminHeader, Card, Facts, Pill } from "./ui";

/** One payment as staff see it. Release is allowed only when the API says so (`actions.canRelease`); the API re-checks everything when it is pressed. */
export async function PaymentDetailPage({ id, viewer }: { id: string; viewer: { permissions: readonly PermissionCode[] } }) {
  const payment = await loadPayment(id);
  const mayRelease = viewer.permissions.includes("payments.release");
  const note = !mayRelease
    ? "Your role can see payments but not release them."
    : payment.status === "released"
      ? "This payment has been released."
      : payment.status === "held"
        ? "The creator has not reported the delivery yet."
        : payment.dispute && payment.dispute.status === "open"
          ? "A dispute is open: this payment can't be released until it is resolved."
          : payment.delivery.releaseEligible
            ? "This payment can't be released in its current state."
            : "Not yet: the brand can still dispute the delivery. It can be released after the brand acknowledges delivery, the dispute window passes, or a dispute is dismissed.";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/payments" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover">
        <FiArrowLeft aria-hidden />
        Back to payments
      </Link>
      <AdminHeader
        title={payment.reference}
        text={`${payment.brand.name} → ${payment.creator.displayName} · ${payment.engagement.campaign?.title ?? "Direct hire"}`}
        action={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={payment.status === "released" ? "good" : "wait"}>{label(PAYMENT_STATUS_TEXT, payment.status)}</Pill>
            {payment.simulated && <Pill tone="warn">Simulated</Pill>}
          </span>
        }
      />
      {payment.simulated && <p className="rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-sm font-medium text-warning">Simulated payment: a development test. No real money moved.</p>}
      <Card title="Amounts (frozen when the payment was confirmed)">
        <Facts items={[["Paid by the brand", formatFcfa(payment.amountXaf)], [`Platform fee (${payment.feeRatePct}%)`, formatFcfa(payment.feeXaf)], ["Creator's net", formatFcfa(payment.netXaf)], ["Paid on", dateTime(payment.fundedAt)]]} />
        {payment.collection && (
          <p className="mt-4 text-sm text-body">
            Collected with {payment.collection.payer.method === "mtn_momo" ? "MTN MoMo" : payment.collection.payer.method === "orange_money" ? "Orange Money" : "mobile money"} from a number ending {payment.collection.payer.last3} ({payment.collection.status}).
          </p>
        )}
      </Card>
      <Card title="Delivery and dispute">
        <Facts
          items={[
            ["Delivery reported", dateTime(payment.delivery.reportedAt)],
            ["Brand acknowledged", dateTime(payment.delivery.acknowledgedAt)],
            ["Dispute window ends", dateTime(payment.delivery.disputeDeadline)],
            ["Dispute", payment.dispute ? `${payment.dispute.status ?? "—"}${payment.dispute.reason ? `: ${payment.dispute.reason}` : ""}` : "None"],
            ["Released", dateTime(payment.releasedAt)],
          ]}
        />
      </Card>
      <Card title="Release">
        <PaymentRelease id={payment.id} canRelease={mayRelease && payment.actions.canRelease} eligibleNote={note} />
        <p className="mt-4 text-xs text-muted">Release credits the creator’s wallet with the net amount. No money leaves the platform here: withdrawals are reviewed separately.</p>
      </Card>
    </div>
  );
}
