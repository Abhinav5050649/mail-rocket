import * as React from "react";
import { cx } from "@/utils/cx";

/**
 * Form controls. Native elements throughout (input, textarea, select,
 * checkbox) so react-hook-form's `register` works directly and the browser's
 * own pickers and autofill stay intact; only their chrome is styled.
 */

const control =
  "w-full rounded-control border border-control bg-sheet px-3 text-sm text-text placeholder:text-faint " +
  "transition-[border-color,box-shadow] duration-150 ease-out hover:border-faint " +
  "focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted " +
  "aria-invalid:border-negative aria-invalid:focus:ring-negative/20";

interface FieldProps {
  label: string;
  /** Grey help line under the control; replaced by `error` when there is one. */
  hint?: React.ReactNode;
  error?: string;
  /** Marks the label "Optional" so required fields need no asterisk. */
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
}

/** Label above, control, then a hint or an error. Wires ids and aria attributes for the control. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = React.useId();
  const describedBy = error || hint ? `${id}-hint` : undefined;

  return (
    <div className={cx("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-text">
        {label}
        {optional && <span className="text-xs font-normal text-faint">Optional</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {(error || hint) && (
        <p id={describedBy} className={cx("text-xs", error ? "text-negative" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} {...props} className={cx(control, "h-9", className)} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} {...props} className={cx(control, "min-h-20 py-2 leading-5", className)} />;
  },
);

export interface SelectOption {
  label: string;
  value: string;
}

/**
 * A native select. `className` sizes the wrapper (so the chevron stays at the
 * select's own right edge); `size="sm"` gives the 32px toolbar height.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & { options: SelectOption[]; size?: "sm" | "md" }
>(function Select({ className, options, size = "md", ...props }, ref) {
  return (
    <div className={cx("relative w-full", className)}>
      <select ref={ref} {...props} className={cx(control, size === "sm" ? "h-8" : "h-9", "appearance-none pr-8")}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

/** A checkbox with its label on the right and an optional description under it. */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; description?: string }
>(function Checkbox({ label, description, className, ...props }, ref) {
  const id = React.useId();
  return (
    <div className={cx("flex items-start gap-2.5", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        {...props}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px] accent-(--accent)"
      />
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5">
        <span className="text-sm font-medium text-text">{label}</span>
        {description && <span className="text-xs text-muted">{description}</span>}
      </label>
    </div>
  );
});
