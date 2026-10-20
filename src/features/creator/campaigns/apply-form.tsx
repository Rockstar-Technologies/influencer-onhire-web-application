"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { offerFailureNotice } from "@/features/offers/failure";
import type { FailureNotice } from "@/features/offers/failure";
import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { applyToCampaignAction } from "./actions";
import { applyFailureNotice } from "./failure";
import { PITCH_MAX, PITCH_MIN, applicationToApi, validateApplication } from "./query";
import type { ApplyErrors } from "./query";

interface Props {
  campaignId: string;
  budgetXaf: number;
  platforms: { platform: string; name: string; handle: string; priceXaf: number }[];
}

const input = "w-full rounded-md border bg-surface px-3 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/20";

/** Apply to one campaign: a platform of the creator's own, a price (at most the brand's maximum), and a short pitch. Shown as sent only after the API confirmed. */
export function ApplyForm({ campaignId, budgetXaf, platforms }: Props) {
  const router = useRouter();
  const [platform, setPlatform] = useState(platforms[0]?.platform ?? "");
  const rateOf = (code: string) => platforms.find((p) => p.platform === code)?.priceXaf ?? 0;
  const [price, setPrice] = useState(String(Math.min(rateOf(platforms[0]?.platform ?? ""), budgetXaf) || ""));
  const [pitch, setPitch] = useState("");
  const [errors, setErrors] = useState<ApplyErrors>({});
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const inFlight = useRef(false);
  const returnTo = `/creator/campaigns/${campaignId}`;

  function choose(code: string) {
    setPlatform(code);
    setPrice(String(Math.min(rateOf(code), budgetXaf) || ""));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return; // a second submit in the same instant must not send a second application
    const problems = validateApplication({ platform, price, pitch }, { platforms: platforms.map((p) => p.platform), budgetXaf });
    setErrors(problems);
    setNotice(null);
    if (Object.keys(problems).length > 0) return setNotice({ text: "Please fix the highlighted fields. Nothing was sent." });
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await applyToCampaignAction({ campaignId, ...applicationToApi({ platform, price, pitch }) });
      if (result.ok) {
        setSent(true);
        router.refresh(); // the page now shows the application the API holds
        return;
      }
      if (result.error.kind === "validation") setErrors(result.error.fields);
      setNotice(applyFailureNotice(result.error, returnTo));
    } catch {
      setNotice(offerFailureNotice({ kind: "unavailable", requestId: null }, returnTo, { href: "/creator/campaigns", label: "Back to campaigns" }));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (platforms.length === 0) {
    return <p className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm text-body">Your profile has no platforms yet, so you can&apos;t apply.</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-display text-base font-bold text-heading">Apply to this campaign</h2>
      {sent && (
        <p role="status" className="rounded-xl border border-success/30 bg-success-light px-4 py-3 text-sm font-medium text-success-strong">
          Your application was sent. The brand will accept or decline it; you can withdraw it while it is pending.
        </p>
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
      <div>
        <label htmlFor="apply-platform" className="mb-2 block text-sm font-semibold text-heading">
          Platform
        </label>
        <select id="apply-platform" value={platform} onChange={(e) => choose(e.target.value)} className={cn(input, "h-11", errors.platform ? "border-danger" : "border-border")}>
          {platforms.map((p) => (
            <option key={p.platform} value={p.platform}>
              {p.name} {p.handle} · your rate {formatFcfa(p.priceXaf)}
            </option>
          ))}
        </select>
        {errors.platform && <p className="mt-1.5 text-xs font-medium text-danger">{errors.platform}</p>}
      </div>
      <div>
        <label htmlFor="apply-price" className="mb-2 block text-sm font-semibold text-heading">
          Your price (CFA)
        </label>
        <input id="apply-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={errors.price ? true : undefined} className={cn(input, "h-11", errors.price ? "border-danger" : "border-border")} />
        <p className="mt-1.5 text-xs text-muted">At most {formatFcfa(budgetXaf)}, the brand&apos;s maximum per creator. If accepted, this is the price the brand pays.</p>
        {errors.price && <p className="mt-1 text-xs font-medium text-danger">{errors.price}</p>}
      </div>
      <div>
        <label htmlFor="apply-pitch" className="mb-2 block text-sm font-semibold text-heading">
          Your pitch
        </label>
        <textarea id="apply-pitch" rows={4} maxLength={PITCH_MAX} value={pitch} onChange={(e) => setPitch(e.target.value)} aria-invalid={errors.pitch ? true : undefined} className={cn(input, "py-3", errors.pitch ? "border-danger" : "border-border")} placeholder="Why you are a good fit and what you would create." />
        <div className="mt-1.5 flex justify-between gap-3 text-xs">
          <span className={errors.pitch ? "font-medium text-danger" : "text-muted"}>{errors.pitch ?? `${PITCH_MIN} to ${PITCH_MAX} characters. The brand reads this.`}</span>
          <span className="text-muted" aria-live="polite">
            {pitch.length}/{PITCH_MAX}
          </span>
        </div>
      </div>
      {errors.form && <p className="text-xs font-medium text-danger">{errors.form}</p>}
      <button type="submit" disabled={busy || sent} className="h-12 w-full rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? "Sending…" : sent ? "Application sent" : "Send application"}
      </button>
      <p className="text-xs text-muted">One application per campaign, ever: a withdrawn or declined application can&apos;t be sent again. No payment is taken now.</p>
    </form>
  );
}
