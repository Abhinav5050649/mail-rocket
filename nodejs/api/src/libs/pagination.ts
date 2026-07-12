/**
 * Query params accepted by every list endpoint: `count` caps how many rows
 * come back, `pageToken` is the `id` of the last row from the previous
 * page - the next page picks up strictly after it. Callers get the value
 * for `pageToken` from the `next_page_token` of the previous response.
 */
export interface PaginationOptions {
    count?: number;
    pageToken?: string;
}

/** Number of rows a list endpoint returns when the caller doesn't pass `count`. */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Encodes a row `id` into the opaque `page_token` string returned to
 * clients, so the cursor value isn't exposed as a bare database id.
 */
export const encodePageToken = (id: string): string => Buffer.from(id, "utf-8").toString("base64");

/**
 * Decodes a `page_token` query param back into the row `id` it was built
 * from, for use as the pagination cursor.
 */
export const decodePageToken = (token: string): string => Buffer.from(token, "base64").toString("utf-8");

/**
 * Builds the paginated response envelope for a list endpoint.
 *
 * @param items - the page of rows just fetched (already limited to `count`).
 * @param count - the effective `count` used for the query (after applying
 * `DEFAULT_PAGE_SIZE`), used to detect whether the page came back full.
 * @returns `{ data, next_page_token }` - `next_page_token` is the
 * base64-encoded id of the last row when the page came back full
 * (implying more rows may follow), or `null` on a partial/empty page.
 */
export function buildPage<T extends { id: string | null }>(items: T[], count: number): { data: T[]; next_page_token: string | null } {
    const lastItem = items[items.length - 1];
    const hasMore = items.length === count && lastItem?.id != null;

    return {
        data: items,
        next_page_token: hasMore ? encodePageToken(lastItem!.id!) : null,
    };
}
