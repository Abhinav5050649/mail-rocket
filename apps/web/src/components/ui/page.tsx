"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "@untitledui/icons";
import { cx } from "@/utils/cx";

/**
 * Page scaffolding inside the sheet: the title row, underline route tabs,
 * cards, and the two-column settings rows used by every detail and form.
 */

interface PageHeaderProps {
  title: React.ReactNode;
  /** A pill or two beside the title. */
  status?: React.ReactNode;
  /** One grey sentence about the data: the finding, the period, the scope. */
  description?: React.ReactNode;
  /** Link back to the parent list. */
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, status, description, back, actions, className }: PageHeaderProps) {
  return (
    <header className={cx("flex flex-col gap-3", className)}>
      {back && (
        <Link
          href={back.href}
          className="-ml-1 flex w-max items-center gap-0.5 rounded-control px-1 text-sm text-muted transition-colors hover:text-text"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 text-title font-semibold tracking-[-0.01em] break-words text-text">{title}</h1>
            {status}
          </div>
          {description && <div className="text-sm text-muted">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export interface TabItem {
  label: string;
  href: string;
  /** Count shown after the label, in grey. */
  count?: number;
  /** Match only this exact path, so an "Overview" tab doesn't stay active on sub-routes. */
  exact?: boolean;
  /** Overrides path matching, e.g. for tabs driven by a query param. */
  active?: boolean;
}

/** Underline tabs on a full-width rule. Each tab is a link; the row scrolls sideways on a phone. */
export function Tabs({ items, label, className }: { items: TabItem[]; label: string; className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className={cx("-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0", className)}>
      <div className="flex min-w-max gap-5 border-b border-border">
        {items.map((item) => {
          const active = item.active ?? (item.exact ? pathname === item.href : pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "-mb-px flex items-center gap-1.5 border-b-2 pt-1 pb-2.5 text-sm whitespace-nowrap transition-colors duration-150",
                active ? "border-text font-medium text-text" : "border-transparent text-muted hover:text-text",
              )}
            >
              {item.label}
              {item.count !== undefined && <span className="tabular text-faint">{item.count}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** A bordered white panel with an optional header row (title, meta, action). */
export function Card({
  title,
  meta,
  action,
  children,
  className,
  bodyClassName,
  as: As = "section",
}: {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div";
}) {
  return (
    <As className={cx("flex min-w-0 flex-col rounded-card border border-border bg-sheet", className)}>
      {(title || action) && (
        <div className="flex min-h-12 items-start justify-between gap-3 px-4 pt-4 sm:items-center sm:px-5">
          <div className="flex min-w-0 flex-col gap-x-2 sm:flex-row sm:items-baseline">
            {title && <h2 className="truncate text-base font-medium text-text">{title}</h2>}
            {meta && <span className="text-sm text-muted sm:truncate">{meta}</span>}
          </div>
          {action}
        </div>
      )}
      <div className={cx("flex flex-1 flex-col px-4 pt-3 pb-5 sm:px-5", bodyClassName)}>{children}</div>
    </As>
  );
}

/** A small "View all →" style link for card headers. */
export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-sm text-muted transition-colors hover:text-text">
      {children}
    </Link>
  );
}

/**
 * Settings row: a label column (title and a grey description) beside the
 * panel holding the controls. Stacks on narrow screens. Rows are separated
 * by a full-width rule.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
  wide,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Lets the panel use the full width, for tables of long values. */
  wide?: boolean;
}) {
  return (
    <section className={cx("grid gap-4 border-t border-border py-8 first:border-t-0 first:pt-2 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium text-text">{title}</h2>
        {description && <div className="text-sm text-muted">{description}</div>}
      </div>
      <div className={cx("min-w-0", !wide && "max-w-2xl")}>{children}</div>
    </section>
  );
}

/** Label/value pairs on a tinted well, for read-only facts about an object. */
export function FactList({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cx("flex flex-col rounded-card bg-raised px-4 py-1", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-b-0">
          <dt className="shrink-0 text-sm text-muted">{item.label}</dt>
          <dd className="min-w-0 text-right text-sm break-words text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Grey em dash for a missing value. */
export function Dash() {
  return (
    <span className="text-faint" aria-label="none">
      —
    </span>
  );
}

/** The bottom-right Save / Cancel row of a form panel. */
export function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 pt-2">{children}</div>;
}
