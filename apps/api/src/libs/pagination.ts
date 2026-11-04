/**
 * Query params accepted by every list endpoint, following the standard
 * SQL/Postgres `LIMIT`/`OFFSET` convention directly (rather than an opaque
 * cursor): `limit` caps how many rows come back, `offset` skips that many
 * rows before starting to return results.
 */
export interface PaginationOptions {
    limit?: number;
    offset?: number;
}

/** Number of rows a list endpoint returns when the caller doesn't pass `limit`. */
export const DEFAULT_PAGE_SIZE = 10;
