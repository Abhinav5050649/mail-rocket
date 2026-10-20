"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "@untitledui/icons";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { ErrorNotice, Skeleton } from "./feedback";
import { cx } from "@/utils/cx";

export interface Column<Row> {
  header: string;
  cell: (row: Row) => React.ReactNode;
  align?: "left" | "right";
  /** Width/visibility utilities for both the th and td (e.g. "w-40", "hidden lg:table-cell"). */
  className?: string;
}

interface DataTableProps<Row extends { id: string }> {
  /** What the rows are, for screen readers and error messages ("campaigns"). */
  noun: string;
  rows: Row[] | undefined;
  columns: Column<Row>[];
  isLoading: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onRetry?: () => void;
  /** Each row links here; the first column's content becomes the link. */
  href?: (row: Row) => string;
  /** Below `md` each row becomes two lines: a title, a grey subline and a trailing element. */
  mobile: {
    title: (row: Row) => React.ReactNode;
    subtitle?: (row: Row) => React.ReactNode;
    trailing?: (row: Row) => React.ReactNode;
  };
  /** Shown in place of the table when there are no rows. */
  empty: React.ReactNode;
  skeletonRows?: number;
}

/**
 * The list surface every resource shares: rules and alignment, no card
 * around it. Rows link to their detail page; a click anywhere on the row
 * follows the same link, while the real `<a>` keeps it keyboard- and
 * middle-click-friendly.
 */
export function DataTable<Row extends { id: string }>({
  noun,
  rows,
  columns,
  isLoading,
  error,
  onRetry,
  href,
  mobile,
  empty,
  skeletonRows = 5,
}: DataTableProps<Row>) {
  const router = useRouter();

  if (error) return <ErrorNotice error={error} what={noun} onRetry={onRetry} />;
  if (!isLoading && (!rows || rows.length === 0)) return <>{empty}</>;

  const alignClass = (column: Column<Row>) => (column.align === "right" ? "text-right" : "text-left");

  return (
    <>
      {/* Phone and small tablet: two-line rows. */}
      <ul aria-label={noun} className="flex flex-col md:hidden" aria-busy={isLoading || undefined}>
        {isLoading
          ? Array.from({ length: skeletonRows }, (_, index) => (
              <li key={index} className="flex flex-col gap-2 border-b border-rule py-3.5">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </li>
            ))
          : rows!.map((row) => {
              const content = (
                <>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-text">{mobile.title(row)}</span>
                    {mobile.subtitle && <span className="truncate text-[13px] text-muted">{mobile.subtitle(row)}</span>}
                  </span>
                  {mobile.trailing && <span className="shrink-0">{mobile.trailing(row)}</span>}
                  {href && <ChevronRight className="size-4 shrink-0 text-faint" />}
                </>
              );
              return (
                <li key={row.id} className="border-b border-rule">
                  {href ? (
                    <Link href={href(row)} className="flex min-h-14 items-center gap-3 py-2.5 active:bg-raised">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 py-2.5">{content}</div>
                  )}
                </li>
              );
            })}
      </ul>

      {/* md and up: a real table. */}
      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse text-sm" aria-busy={isLoading || undefined}>
          <caption className="sr-only">{noun}</caption>
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cx("h-9 px-3 text-xs font-normal whitespace-nowrap text-muted first:pl-0 last:pr-0", alignClass(column), column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: skeletonRows }, (_, index) => (
                  <tr key={index} className="h-12 border-b border-rule">
                    {columns.map((column) => (
                      <td key={column.header} className={cx("px-3 first:pl-0 last:pr-0", column.className)}>
                        <Skeleton className={cx("h-3.5", column.align === "right" ? "ml-auto w-16" : "w-3/5")} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows!.map((row) => (
                  <tr
                    key={row.id}
                    onClick={href ? (event) => {
                      // Let real links, buttons and selects inside the row do their own thing.
                      if ((event.target as HTMLElement).closest("a,button,select,input")) return;
                      router.push(href(row));
                    } : undefined}
                    className={cx("h-12 border-b border-rule transition-colors duration-100", href && "cursor-pointer hover:bg-raised")}
                  >
                    {columns.map((column, index) => (
                      <td
                        key={column.header}
                        className={cx("truncate px-3 py-2 text-text first:pl-0 last:pr-0", alignClass(column), column.className)}
                      >
                        {index === 0 && href ? (
                          <Link href={href(row)} className="font-medium text-text outline-offset-2 hover:underline">
                            {column.cell(row)}
                          </Link>
                        ) : (
                          column.cell(row)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Previous/next paging. The API returns no total, so "has a next page" is
 * inferred from a full page; the range shown is the rows on screen.
 */
export function Pagination({
  limit,
  offset,
  rowCount,
  onOffsetChange,
  noun,
}: {
  limit: number;
  offset: number;
  rowCount: number;
  onOffsetChange: (offset: number) => void;
  noun: string;
}) {
  const hasPrev = offset > 0;
  const hasNext = rowCount === limit;
  if (!hasPrev && !hasNext) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="tabular text-sm text-muted">
        {rowCount === 0 ? `No more ${noun}` : `${offset + 1}–${offset + rowCount}`}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          className="h-8 rounded-control border border-control bg-sheet px-3 text-sm text-text transition-colors hover:bg-raised disabled:opacity-45"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onOffsetChange(offset + limit)}
          className="h-8 rounded-control border border-control bg-sheet px-3 text-sm text-text transition-colors hover:bg-raised disabled:opacity-45"
        >
          Next
        </button>
      </div>
    </div>
  );
}
