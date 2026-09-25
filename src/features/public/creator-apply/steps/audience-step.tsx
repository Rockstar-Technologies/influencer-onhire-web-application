"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatNumber, parseAmount } from "@/lib/format";
import { getCreatorApplicationDraft, saveCreatorAudience } from "@/services/creator-application.service";
import type { CreatorApplicationOptions, PastCollaboration, SocialPlatform } from "@/types/creator-application";
import { MissingStep, PlatformIcon, SectionTitle, StepActions, controlClass } from "../apply-ui";

type PlatformRow = { on: boolean; handle: string; followers: string };
type Status = "loading" | "missing" | "ready";

interface Errors {
  platforms?: string;
  rows?: Partial<Record<SocialPlatform, string>>;
  brandFit?: string;
  collaborations?: string;
}

export function AudienceStep({ options }: { options: CreatorApplicationOptions }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<Record<SocialPlatform, PlatformRow>>(() =>
    Object.fromEntries(options.platforms.map((p) => [p.id, { on: false, handle: "", followers: "" }])) as Record<SocialPlatform, PlatformRow>
  );
  const [collaborations, setCollaborations] = useState<PastCollaboration[]>([]);
  const [brandFit, setBrandFit] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCreatorApplicationDraft().then((draft) => {
      if (!draft.basics) return setStatus("missing");
      if (draft.audience) {
        const saved = draft.audience;
        setRows((current) => {
          const next = { ...current };
          for (const item of saved.platforms) next[item.platform] = { on: true, handle: item.handle, followers: formatNumber(item.followers) };
          return next;
        });
        setCollaborations(saved.collaborations);
        setBrandFit(saved.brandFit);
      }
      setStatus("ready");
    });
  }, []);

  const active = options.platforms.filter((p) => rows[p.id].on);
  const totalFollowers = active.reduce((sum, p) => sum + (parseAmount(rows[p.id].followers) || 0), 0);

  function validate(): Errors {
    const errors: Errors = {};
    const rowErrors: Partial<Record<SocialPlatform, string>> = {};
    if (active.length === 0) errors.platforms = "Turn on at least one platform you post on.";
    for (const p of active) {
      const row = rows[p.id];
      const followers = parseAmount(row.followers);
      if (!row.handle.trim()) rowErrors[p.id] = `Add your ${p.label} handle.`;
      else if (!Number.isFinite(followers) || followers <= 0) rowErrors[p.id] = `Add your ${p.label} follower count.`;
    }
    if (Object.keys(rowErrors).length) errors.rows = rowErrors;
    else if (active.length && totalFollowers < options.minFollowers) {
      errors.platforms = `You need at least ${formatNumber(options.minFollowers)} followers in total to join.`;
    }
    if (brandFit.length === 0) errors.brandFit = "Pick at least one kind of brand you'd like to work with.";
    if (collaborations.some((c) => !c.brand.trim() || !/^\d{4}$/.test(c.year.trim()))) {
      errors.collaborations = "Each collaboration needs a brand name and a year, e.g. 2024 — or remove it.";
    }
    return errors;
  }

  const errors = attempted ? validate() : {};
  const updateRow = (id: SocialPlatform, patch: Partial<PlatformRow>) => setRows((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const updateCollab = (index: number, patch: Partial<PastCollaboration>) =>
    setCollaborations((current) => current.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(validate()).length) return;
    setSaving(true);
    await saveCreatorAudience({
      platforms: active.map((p) => ({ platform: p.id, handle: rows[p.id].handle.trim(), followers: parseAmount(rows[p.id].followers) })),
      collaborations: collaborations.map((c) => ({ brand: c.brand.trim(), description: c.description.trim(), year: c.year.trim() })),
      brandFit,
    });
    router.push("/for-creators/apply/rates");
  }

  if (status === "loading") return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" aria-busy="true" />;
  if (status === "missing") return <MissingStep href="/for-creators/apply/profile" label="Go to step 1" />;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SectionTitle>Where do you post?</SectionTitle>
        <p className="-mt-2 text-sm text-body">Turn on each platform and add your handle and followers.</p>
        {options.platforms.map((p) => {
          const row = rows[p.id];
          const rowError = errors.rows?.[p.id];
          return (
            <div key={p.id} className={cn("rounded-xl border p-3 transition-colors", row.on ? "border-primary-border bg-primary-light/40" : "border-border")}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={row.on}
                  onChange={(event) => updateRow(p.id, { on: event.target.checked })}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <PlatformIcon platform={p.id} decorative />
                <span className="text-sm font-semibold text-heading">{p.label}</span>
              </label>
              {row.on && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    aria-label={`${p.label} handle`}
                    value={row.handle}
                    onChange={(event) => updateRow(p.id, { handle: event.target.value })}
                    placeholder="@yourhandle"
                    className={controlClass(Boolean(rowError && !row.handle.trim())) + " h-10"}
                  />
                  <input
                    aria-label={`${p.label} followers`}
                    inputMode="numeric"
                    value={row.followers}
                    onChange={(event) => updateRow(p.id, { followers: event.target.value })}
                    placeholder="Followers, e.g. 25,000"
                    className={controlClass(Boolean(rowError && row.handle.trim())) + " h-10"}
                  />
                  {rowError && <p className="text-xs font-medium text-danger sm:col-span-2">{rowError}</p>}
                </div>
              )}
            </div>
          );
        })}
        {errors.platforms ? (
          <p className="text-xs font-medium text-danger">{errors.platforms}</p>
        ) : (
          active.length > 0 && <p className="text-xs text-muted">Total followers: {formatNumber(totalFollowers)}</p>
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
            <button type="button" onClick={() => setCollaborations((current) => current.filter((_, i) => i !== index))} className="h-10 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-danger">
              Remove
            </button>
          </div>
        ))}
        {errors.collaborations && <p className="text-xs font-medium text-danger">{errors.collaborations}</p>}
        {collaborations.length < options.maxCollaborations && (
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
            const selected = brandFit.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={selected}
                onClick={() => setBrandFit((current) => (selected ? current.filter((t) => t !== tag) : [...current, tag]))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selected ? "border-primary bg-primary text-white" : "border-border bg-surface text-body hover:border-primary-border hover:text-primary"
                )}
              >
                {selected ? "✓ " : ""}
                {tag}
              </button>
            );
          })}
        </div>
        {errors.brandFit && <p className="text-xs font-medium text-danger">{errors.brandFit}</p>}
      </div>

      <StepActions backHref="/for-creators/apply/profile" submitLabel="Continue →" busyLabel="Saving…" busy={saving} />
    </form>
  );
}
