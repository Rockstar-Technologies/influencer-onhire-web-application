"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatNumber, parseAmount } from "@/lib/format";
import { saveAudienceAction } from "@/features/creator-application/actions";
import { failureNotice, fieldError } from "@/features/creator-application/messages";
import type { FailureNotice } from "@/features/creator-application/messages";
import { audienceToApi, totalFollowers } from "@/features/creator-application/mapping";
import type { AudienceForm, CollaborationRow, PlatformRow } from "@/features/creator-application/mapping";
import type { ApplicationOptions } from "@/lib/api/schemas";
import type { PlatformCode } from "@/lib/domain/vocabulary";
import { PlatformIcon, SectionTitle, StepActions, controlClass } from "../apply-ui";

interface Errors {
  platforms?: string;
  rows?: Partial<Record<PlatformCode, string>>;
  brandFit?: string;
  collaborations?: string;
}

export function AudienceStep({ options, initial }: { options: ApplicationOptions; initial: AudienceForm }) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<PlatformCode, PlatformRow>>(initial.platforms);
  const [collaborations, setCollaborations] = useState<CollaborationRow[]>(initial.collaborations);
  const [brandFit, setBrandFit] = useState<number[]>(initial.brandFit);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const { limits } = options;
  const form: AudienceForm = { platforms: rows, collaborations, brandFit };
  const active = options.platforms.filter((p) => rows[p.code]?.on);
  const total = totalFollowers(form, options);
  const thisYear = new Date().getFullYear();

  function validate(): Errors {
    const errors: Errors = {};
    const rowErrors: Partial<Record<PlatformCode, string>> = {};
    if (active.length === 0) errors.platforms = "Turn on at least one platform you post on.";
    for (const p of active) {
      const row = rows[p.code];
      const followers = parseAmount(row.followers);
      if (!row.handle.trim()) rowErrors[p.code] = `Add your ${p.name} handle.`;
      else if (!/^@?[A-Za-z0-9._-]{1,100}$/.test(row.handle.trim())) rowErrors[p.code] = `Use a handle like @yourname (letters, numbers, dots, underscores, hyphens), not a link.`;
      else if (!Number.isFinite(followers) || followers <= 0) rowErrors[p.code] = `Add your ${p.name} follower count.`;
    }
    if (Object.keys(rowErrors).length) errors.rows = rowErrors;
    else if (active.length && total < limits.minTotalFollowers) {
      errors.platforms = `You need at least ${formatNumber(limits.minTotalFollowers)} followers in total to join.`;
    }
    if (brandFit.length === 0) errors.brandFit = "Pick at least one kind of brand you'd like to work with.";
    else if (brandFit.length > limits.maxBrandFitTags) errors.brandFit = `Pick at most ${limits.maxBrandFitTags}.`;
    if (collaborations.some((c) => !c.brand.trim() || !/^\d{4}$/.test(c.year.trim()) || Number(c.year) > thisYear || Number(c.year) < 1990)) {
      errors.collaborations = `Each collaboration needs a brand name and a year between 1990 and ${thisYear} — or remove it.`;
    }
    return errors;
  }

  const local = attempted ? validate() : {};
  const platformsError = local.platforms ?? fieldError(serverErrors, "platforms");
  const brandFitError = local.brandFit ?? fieldError(serverErrors, "brandFit");
  const collaborationsError = local.collaborations ?? fieldError(serverErrors, "collaborations");

  const clearServer = () => setServerErrors((current) => (Object.keys(current).length ? {} : current));
  const updateRow = (code: PlatformCode, patch: Partial<PlatformRow>) => {
    setRows((current) => ({ ...current, [code]: { ...current[code], ...patch } }));
    clearServer();
  };
  const updateCollab = (index: number, patch: Partial<CollaborationRow>) => {
    setCollaborations((current) => current.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    clearServer();
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setAttempted(true);
    setNotice(null);
    if (Object.keys(validate()).length) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const result = await saveAudienceAction(audienceToApi(form, options));
      if (result.ok) {
        router.push("/for-creators/apply/rates");
        return;
      }
      setServerErrors(result.error.kind === "validation" ? result.error.fields : {});
      setNotice(failureNotice(result.error, "/for-creators/apply/audience"));
    } catch {
      setNotice(failureNotice({ kind: "unavailable", requestId: null }, "/for-creators/apply/audience"));
    }
    inFlight.current = false;
    setSaving(false);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SectionTitle>Where do you post?</SectionTitle>
        <p className="-mt-2 text-sm text-body">Turn on each platform and add your handle and followers.</p>
        {options.platforms.map((p) => {
          const row = rows[p.code];
          const rowError = local.rows?.[p.code];
          return (
            <div key={p.code} className={cn("rounded-xl border p-3 transition-colors", row.on ? "border-primary-border bg-primary-light/40" : "border-border")}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={row.on}
                  onChange={(event) => updateRow(p.code, { on: event.target.checked })}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <PlatformIcon platform={p.code} decorative />
                <span className="text-sm font-semibold text-heading">{p.name}</span>
              </label>
              {row.on && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    aria-label={`${p.name} handle`}
                    value={row.handle}
                    onChange={(event) => updateRow(p.code, { handle: event.target.value })}
                    placeholder="@yourhandle"
                    className={controlClass(Boolean(rowError && !row.handle.trim())) + " h-10"}
                  />
                  <input
                    aria-label={`${p.name} followers`}
                    inputMode="numeric"
                    value={row.followers}
                    onChange={(event) => updateRow(p.code, { followers: event.target.value })}
                    placeholder="Followers, e.g. 25,000"
                    className={controlClass(Boolean(rowError && row.handle.trim())) + " h-10"}
                  />
                  {rowError && <p className="text-xs font-medium text-danger sm:col-span-2">{rowError}</p>}
                </div>
              )}
            </div>
          );
        })}
        {platformsError ? (
          <p className="text-xs font-medium text-danger">{platformsError}</p>
        ) : (
          active.length > 0 && <p className="text-xs text-muted">Total followers: {formatNumber(total)}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>
          Past collaborations <span className="text-sm font-normal text-muted">(optional)</span>
        </SectionTitle>
        {collaborations.map((collab, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1.4fr_5.5rem_auto]">
            <input aria-label="Brand" value={collab.brand} onChange={(e) => updateCollab(index, { brand: e.target.value })} placeholder="Brand, e.g. MTN Cameroon" className={controlClass() + " h-10"} />
            <input aria-label="What you did" value={collab.description} onChange={(e) => updateCollab(index, { description: e.target.value })} placeholder="e.g. Brand Ambassador" className={controlClass() + " h-10"} />
            <input aria-label="Year" inputMode="numeric" maxLength={4} value={collab.year} onChange={(e) => updateCollab(index, { year: e.target.value })} placeholder="Year" className={controlClass() + " h-10"} />
            <button
              type="button"
              onClick={() => {
                setCollaborations((current) => current.filter((_, i) => i !== index));
                clearServer();
              }}
              className="h-10 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-danger"
            >
              Remove
            </button>
          </div>
        ))}
        {collaborationsError && <p className="text-xs font-medium text-danger">{collaborationsError}</p>}
        {collaborations.length < limits.maxCollaborations && (
          <button
            type="button"
            onClick={() => setCollaborations((current) => [...current, { brand: "", description: "", year: "" }])}
            className="self-start rounded-full border border-dashed border-primary-border px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-light"
          >
            + Add a collaboration
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Brand fit</SectionTitle>
        <p className="-mt-2 text-sm text-body">Which kinds of brands suit your audience? Pick all that apply.</p>
        <div className="flex flex-wrap gap-2">
          {options.brandFit.map((tag) => {
            const selected = brandFit.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setBrandFit((current) => (selected ? current.filter((id) => id !== tag.id) : [...current, tag.id]));
                  clearServer();
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selected ? "border-primary bg-primary text-white" : "border-border bg-surface text-body hover:border-primary-border hover:text-primary"
                )}
              >
                {selected ? "✓ " : ""}
                {tag.name}
              </button>
            );
          })}
        </div>
        {brandFitError && <p className="text-xs font-medium text-danger">{brandFitError}</p>}
      </div>

      <StepActions
        backHref="/for-creators/apply/profile"
        submitLabel="Continue →"
        busyLabel="Saving…"
        busy={saving}
        error={notice?.text ?? null}
        {...(notice?.link ? { errorLink: notice.link } : {})}
      />
    </form>
  );
}
