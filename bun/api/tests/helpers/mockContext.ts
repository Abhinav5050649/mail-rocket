import { expect, mock } from "bun:test";
import { HTTPException } from "hono/http-exception";

/**
 * Minimal stand-in for Hono's `Context`, covering exactly what controllers
 * in this codebase touch: route params (`c.req.param`), query params
 * (`c.req.query`), the JSON body (`c.req.json`), stored variables (`c.get`,
 * set by middleware like `authenticate`), and `c.json` responses.
 * Controllers receive this directly instead of a real Hono `Context` - no
 * HTTP layer or routing is exercised, so these stay true unit tests of the
 * controller methods.
 */
export interface MockContextOptions {
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
    variables?: Record<string, unknown>;
}

export function createMockContext(options: MockContextOptions = {}) {
    const { params = {}, query = {}, body, variables = {} } = options;

    return {
        req: {
            param: mock((key: string) => params[key]),
            query: mock((key: string) => query[key]),
            json: mock(async () => body),
            method: "GET",
            path: "/",
        },
        get: mock((key: string) => variables[key]),
        set: mock(() => {}),
        json: mock((data: unknown, status?: number) => ({ body: data, status: status ?? 200 })),
    } as any;
}

/**
 * Awaits `promise`, asserting it rejects with an `HTTPException` carrying
 * `status` (and optionally a message substring). Every controller in this
 * codebase signals expected error conditions (missing params, not-found
 * rows) this way rather than returning an error response directly.
 */
export async function expectHttpException(promise: Promise<unknown>, status: number, messageContains?: string) {
    try {
        await promise;
        throw new Error(`Expected HTTPException(${status}) to be thrown, but the call resolved`);
    } catch (err) {
        if (!(err instanceof HTTPException)) throw err;
        expect(err.status as number).toBe(status);
        if (messageContains) expect(err.message).toContain(messageContains);
    }
}
