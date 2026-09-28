"use client";

import { useEffect, useRef } from "react";
import { FiCheck } from "react-icons/fi";
import { Button } from "@/components/shared/button";
import type { HireRequest } from "@/types/hire-request";

interface HireSuccessProps {
  username: string;
  firstName: string;
  request: HireRequest;
  durationLabel: string;
}

export function HireSuccess({ username, firstName, request, durationLabel }: HireSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so screen reader and keyboard users land on it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const details = [
    { label: "Reference", value: request.reference },
    { label: "Campaign duration", value: durationLabel },
    { label: "Payment method", value: request.paymentMethod },
  ];

  const steps = [
    `${firstName} reviews your request, usually within 48 hours.`,
    "You agree on deliverables and the final price together.",
    `You pay with ${request.paymentMethod}. Funds are held in escrow until the content is delivered.`,
  ];

  return (
    <div className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-success">
        <FiCheck size={28} />
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-xl font-bold text-heading focus:outline-none">
        Hire request sent
      </h2>
      <p className="mt-2 text-sm text-body">
        Thanks, {request.fullName.split(" ")[0]}. We&apos;ve sent your request to {firstName}.
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
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button href={`/influencers/${username}`} variant="outline" className="rounded-lg">
          View {firstName}&apos;s profile
        </Button>
        <Button href="/influencers" className="rounded-lg">
          Browse more influencers
        </Button>
      </div>
    </div>
  );
}
