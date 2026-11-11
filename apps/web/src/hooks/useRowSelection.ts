import { useMemo, useState } from "react";

/**
 * Which rows of a list are ticked, for bulk actions. Only rows currently on
 * screen count: paging, or a refetch that drops a row (say, after deleting
 * it), quietly leaves those ids out instead of acting on rows nobody can see.
 *
 * @param rows - The rows shown right now (`undefined` while loading).
 * @returns The selected ids among `rows`, plus setters for the table and the selection bar.
 */
export function useRowSelection<Row extends { id: string }>(rows: Row[] | undefined) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  // Ids on screen, so the selection is derived from them rather than synced with an effect.
  const visibleIds = useMemo(() => (rows ?? []).map((row) => row.id), [rows]);
  const selected = useMemo(() => new Set(visibleIds.filter((id) => picked.has(id))), [visibleIds, picked]);

  return {
    /** Ticked ids that are on screen. */
    selected,
    /** Replaces the selection (the table's checkboxes call this). */
    setSelected: setPicked,
    /** Ticks every row on screen. */
    selectAll: () => setPicked(new Set(visibleIds)),
    /** Unticks everything. */
    clear: () => setPicked(new Set()),
    /** How many rows are on screen, for "Select all 25". */
    visibleCount: visibleIds.length,
  };
}
