import { cx } from "@/utils/cx";

/**
 * Mail Rocket's mark: an envelope with two speed lines trailing it, so the
 * letter reads as being sent. Drawn in the sheet colour on an accent tile.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("size-6 shrink-0", className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <rect x="8" y="7.5" width="11.5" height="9" rx="1.25" fill="none" stroke="var(--sheet)" strokeWidth="1.6" />
      <path d="m8.4 8.2 5.35 4.1 5.35-4.1" fill="none" stroke="var(--sheet)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.75 10.5h2.5M4.75 13.5h1.5" stroke="var(--sheet)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** The mark with the product name beside it. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-text">Mail Rocket</span>
    </span>
  );
}
