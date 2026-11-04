import type { TagDescription } from "@reduxjs/toolkit/query";

/**
 * Standard tag shape for a list query: tags every row plus a `LIST` sentinel,
 * so a create invalidates `LIST` while an update/delete invalidates just its
 * own row (and callers can additionally invalidate `LIST` on delete).
 */
export function listTags<Type extends string, Extra extends string = never>(
  type: Type,
  rows: { id: string }[] | undefined,
  extraIds: Extra[] = []
): TagDescription<Type>[] {
  return [
    { type, id: "LIST" as const },
    ...extraIds.map((id) => ({ type, id })),
    ...(rows ?? []).map((row) => ({ type, id: row.id })),
  ];
}

/** Tags a single get-by-id query. */
export function itemTag<Type extends string>(type: Type, id: string): TagDescription<Type>[] {
  return [{ type, id }];
}
