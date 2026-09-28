import { FiInfo } from "react-icons/fi";

// CSS-only tooltip that opens on hover and keyboard focus. Anchored right so it opens leftwards
// and never widens a horizontally scrolling table.
export function InfoTip({ id, children }: { id: string; children: string }) {
  return (
    <span className="group/tip relative ml-1 inline-flex align-middle normal-case tracking-normal">
      <button type="button" aria-describedby={id} aria-label="More information" className="rounded-full text-muted hover:text-navy focus-visible:text-navy">
        <FiInfo size={13} />
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible absolute right-0 top-full z-10 mt-2 w-64 rounded-lg bg-heading px-3 py-2 text-left text-xs font-medium leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
