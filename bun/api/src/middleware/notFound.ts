import type { NotFoundHandler } from "hono";

/**
 * Global Hono not-found handler, registered via `app.notFound(notFound)` in
 * `index.ts`. Replaces Hono's default behavior (a plain-text "404 Not Found"
 * response) so that unmatched routes return the same JSON error shape as
 * every other response from this API.
 *
 * @param c - Hono request context.
 * @returns A JSON 404 `Response`.
 */
export const notFound: NotFoundHandler = (c) => {
    return c.json({ error: "Not Found" }, 404);
};
