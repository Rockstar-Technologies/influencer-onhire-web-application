import { initials } from "@/lib/utils";

/** No photo is shown anywhere yet (the backend has no media delivery), so a creator is recognised by their initials. */
export function CreatorAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-primary-light font-bold text-primary ${className ?? "h-12 w-12 text-base"}`}>
      {initials(name)}
    </span>
  );
}
