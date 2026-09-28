import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@/types/creator-application";

export function controlClass(hasError?: boolean) {
  return cn(
    "w-full rounded-lg border bg-surface px-3 text-sm text-heading outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15",
    hasError ? "border-danger" : "border-border"
  );
}

export function Field({
  id,
  label,
  hint,
  optional,
  error,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-heading">
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-bold text-heading">{children}</h2>;
}

export function StepActions({
  backHref,
  onBack,
  submitLabel,
  busyLabel,
  busy,
  error,
}: {
  backHref?: string;
  onBack?: () => void;
  submitLabel: string;
  busyLabel: string;
  busy: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-light pt-5">
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-sm font-semibold text-body hover:text-primary">
            ← Back
          </button>
        ) : backHref ? (
          <Link href={backHref} className="text-sm font-semibold text-body hover:text-primary">
            ← Back
          </Link>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? busyLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

// Official brand marks (Simple Icons, in each brand's colour) served from /public/icons/social.
export function PlatformIcon({
  platform,
  size = 20,
  decorative,
  className,
}: {
  platform: SocialPlatform;
  size?: number;
  // Set when the platform name is already written next to the logo.
  decorative?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={`/icons/social/${platform}.svg`}
      alt={decorative ? "" : PLATFORM_NAMES[platform]}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}

export function MissingStep({ href, label }: { href: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-semibold text-heading">Let&apos;s start from the beginning</p>
      <p className="mt-1 text-sm text-body">This step needs the details from the previous one.</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        {label}
      </Link>
    </div>
  );
}
