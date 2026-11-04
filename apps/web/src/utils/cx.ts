import { extendTailwindMerge } from "tailwind-merge";

/**
 * `tailwind-merge` that knows this app's custom type sizes (`text-title`,
 * `text-kpi`), so it doesn't mistake them for colours and drop a real
 * `text-<colour>` class that sits beside them.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["title", "kpi"],
    },
  },
});

/** Joins class names, letting later Tailwind classes override earlier conflicting ones. */
export const cx = twMerge;
