"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_PAGE_SIZE } from "@/types/resources";

/**
 * List state kept in the URL (`limit`, `offset`, and any filter params) so it
 * survives a refresh, back-navigation and a shared link.
 */
export function usePaginationParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const limit = Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE;
  const offset = Number(searchParams.get("offset")) || 0;

  /** Merges `next` into the query string; an empty value removes that param. */
  const update = React.useCallback(
    (next: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return {
    limit,
    offset,
    searchParams,
    setOffset: (value: number) => update({ offset: value || undefined }),
    /** Sets a filter and returns to the first page. */
    setFilter: (key: string, value: string | undefined) => update({ [key]: value, offset: undefined }),
  };
}
