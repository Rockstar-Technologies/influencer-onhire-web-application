"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FiCheck } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import type { OfferView } from "@/lib/api/schemas";
import { formatDate, formatFcfa } from "@/lib/format";
import { HIRE_VALID_DAYS, hireAnswerBy } from "../mapping";

/** Shown only after the API created the hire request: every figure below is the API's own (price, reference, platform, duration). */
export function HireSuccess({ firstName, offer }: { firstName: string; offer: OfferView }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const answerBy = hireAnswerBy(offer);
  const details = [
    { label: "Reference", value: offer.reference },
    { label: "Platform", value: offer.platform?.name ?? "—" },
    { label: "Price", value: formatFcfa(offer.priceXaf) },
    { label: "Campaign duration", value: offer.hire?.durationLabel ?? "—" },
    { label: "Payment method", value: offer.hire?.paymentMethod.name ?? "—" },
  ];
  const steps = [
    `${firstName} has ${HIRE_VALID_DAYS} days to accept or decline${answerBy ? ` (until ${formatDate(answerBy.toISOString())})` : ""}. After that the request expires.`,
    "If they accept, they choose the start date and the booking runs for the duration you picked.",
    "You can see their answer, or cancel the request while it is pending, under My hires.",
  ];

  return (
    <div className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-success">
        <FiCheck size={28} />
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-xl font-bold text-heading focus:outline-none">
        Hire request sent
      </h2>
      <p role="status" className="mt-2 text-sm text-body">
        Your request was sent to {firstName} at their listed rate.
      </p>
      <dl className="mt-6 divide-y divide-border rounded-xl border border-border text-left text-sm">
        {details.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold text-heading">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 text-left">
        <h3 className="text-sm font-semibold text-heading">What happens next</h3>
        <ol className="mt-3 space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm text-body">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/brand/offers" className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          See my hire requests
        </Link>
        <Button href="/influencers" variant="outline" className="rounded-lg">
          Browse more influencers
        </Button>
      </div>
    </div>
  );
}
