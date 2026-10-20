import * as React from "react";
import Link from "next/link";
import { cx } from "@/utils/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,transform] duration-150 ease-out active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-55 aria-busy:cursor-progress";

const variants: Record<Variant, string> = {
  /** Near-black fill: the one primary action on a screen. */
  primary: "bg-primary text-primary-ink hover:bg-primary/85",
  /** White with a control-weight border. */
  secondary: "border border-control bg-sheet text-text hover:bg-raised",
  /** Text only, for tertiary actions and toolbar icons. */
  ghost: "text-muted hover:bg-raised hover:text-text",
  /** Destructive, always outlined so it never competes with the primary. */
  danger: "border border-negative/45 bg-sheet text-negative hover:bg-negative/8",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-sm",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  /** Leading 16px icon from @untitledui/icons. */
  icon?: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type ButtonProps = CommonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;
type LinkProps = CommonProps & { href: string };

/** Small spinner shown in place of the icon while a button's action is in flight. */
function Spinner() {
  return (
    <svg className="size-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Renders the button's inner content: the icon (or spinner) and the label. */
function Content({ icon: Icon, isLoading, children }: CommonProps) {
  return (
    <>
      {isLoading ? <Spinner /> : Icon ? <Icon className="size-4 shrink-0" /> : null}
      {children}
    </>
  );
}

/** A button, or a link styled as one when `href` is given. */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = "secondary", size = "md", className } = props;
  const classes = cx(base, variants[variant], sizes[size], className);

  if ("href" in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        <Content {...props} />
      </Link>
    );
  }

  // Pull out the styling props so only real <button> attributes reach the DOM.
  const { icon, isLoading, children, disabled, type = "button", ...attributes } = props as ButtonProps;
  const rest = Object.fromEntries(Object.entries(attributes).filter(([key]) => !["variant", "size", "className"].includes(key)));
  return (
    <button {...rest} type={type} disabled={disabled || isLoading} aria-busy={isLoading || undefined} className={classes}>
      <Content icon={icon} isLoading={isLoading}>
        {children}
      </Content>
    </button>
  );
}

/** A square icon-only button with an accessible name. */
export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: { icon: React.ComponentType<{ className?: string }>; label: string; className?: string } & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children"
>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-150 ease-out hover:bg-active hover:text-text disabled:opacity-50",
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
