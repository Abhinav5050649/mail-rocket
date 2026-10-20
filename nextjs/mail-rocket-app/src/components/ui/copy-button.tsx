"use client";

import { Check, Copy01 } from "@untitledui/icons";
import { useClipboard } from "@/hooks/use-clipboard";
import { cx } from "@/utils/cx";

/** Copies `value` and confirms with a check for two seconds. */
export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const { copied, copy } = useClipboard();
  const Icon = copied ? Check : Copy01;

  return (
    <button
      type="button"
      onClick={() => copy(value)}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={cx(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-150 hover:bg-active hover:text-text",
        copied && "text-positive hover:text-positive",
        className,
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
