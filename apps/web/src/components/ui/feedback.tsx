import * as React from "react";
import { AlertCircle, AlertTriangle } from "@untitledui/icons";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { getApiErrorMessage } from "@/lib/redux/api/errors";
import { cx } from "@/utils/cx";

type ApiError = FetchBaseQueryError | SerializedError;

/** A flat grey bar standing in for a value while it loads, at the value's real size. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block animate-pulse rounded-[4px] bg-track", className)} />;
}

/**
 * One sentence saying what failed, inside the block that failed, with a
 * Retry when the caller can refetch. The negative colour stays on the icon.
 */
export function ErrorNotice({ error, what, onRetry, className }: { error?: ApiError; what?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cx("flex items-start gap-2.5 rounded-card bg-raised px-3.5 py-3 text-sm", className)}>
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-negative" />
      <p className="flex-1 text-text">
        {what ? `Couldn't load ${what}. ` : ""}
        <span className="text-muted">{getApiErrorMessage(error)}</span>
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm font-medium text-text underline-offset-3 hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}

/** A server-side failure on a form submit, shown above the form's actions. */
export function FormError({ error }: { error?: ApiError }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-card bg-(--pill-negative-bg) px-3.5 py-2.5 text-sm text-(--pill-negative-ink)">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{getApiErrorMessage(error)}</p>
    </div>
  );
}

/** A quiet amber notice for something that needs doing but isn't broken. */
export function Notice({ title, children, action, className }: { title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-3 rounded-card border border-(--notice-border) bg-(--pill-warning-bg) px-4 py-3 sm:flex-row sm:items-start", className)}>
      <AlertTriangle className="mt-0.5 hidden size-4 shrink-0 text-warning sm:block" />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium text-(--pill-warning-ink)">{title}</p>
        {children && <div className="text-sm text-(--pill-warning-ink)/85">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/**
 * An empty section keeps its frame: one sentence saying what will appear
 * here, and the action that puts it there.
 */
export function EmptyState({ title, children, action, className }: { title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-start gap-3 rounded-card border border-dashed border-control px-5 py-6", className)}>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text">{title}</p>
        {children && <div className="max-w-prose text-sm text-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}
