import { cx } from "@/utils/cx";

/**
 * Mail Rocket's mark: an envelope as the body of a rocket heading up, with a
 * nose cone above it, swept fins at its sides and an exhaust flame below, so
 * the letter reads as being launched. Drawn in the sheet colour on an accent
 * tile, so it follows the light and dark themes. The same drawing, in the
 * light theme's colours, is the favicon (`src/app/icon.svg`, `favicon.ico`)
 * and the docs site's logo (`website/static/img/logo.svg`).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("size-6 shrink-0", className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      {/* Scaled in a little so the flame and nose keep clear of the tile's edges. */}
      <g transform="translate(12 12) scale(0.92) translate(-12 -12.2)">
        {/* Exhaust flame, softened so the envelope stays the focus. */}
        <path d="M10 17q.8 3.6 2 5 1.2-1.4 2-5Z" fill="var(--sheet)" opacity="0.6" />
        {/* Fins, swept back from the envelope's sides. */}
        <path d="M7 12.6 4 15.6v3l3-2ZM17 12.6l3 3v3l-3-2Z" fill="var(--sheet)" />
        {/* Nose cone. */}
        <path d="M7.4 9.2Q8.4 4.8 12 2.4q3.6 2.4 4.6 6.8Z" fill="var(--sheet)" />
        {/* The envelope: body outline, then its flap. */}
        <rect x="6.6" y="9.2" width="10.8" height="7.8" rx="1" fill="var(--accent)" stroke="var(--sheet)" strokeWidth="1.6" />
        <path d="m7.2 9.8 4.8 3.6 4.8-3.6" fill="none" stroke="var(--sheet)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
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
