import { mock } from "bun:test";

/**
 * Builds a thenable stand-in for a Drizzle query-builder chain: every
 * chained method (`.from`, `.where`, `.orderBy`, `.limit`, `.offset`,
 * `.set`, `.values`, `.returning`, `.innerJoin`, `.leftJoin`, `.groupBy`)
 * returns the same node, and the node itself resolves to `result` when
 * awaited - so no matter where a given call in the source actually stops
 * chaining and awaits, it gets `result` back. Mirrors how every
 * service/model in this codebase uses Drizzle: a chain of builder calls,
 * awaited once at the end.
 */
export function chain(result: unknown) {
    const methods = ["from", "where", "orderBy", "limit", "offset", "set", "values", "returning", "innerJoin", "leftJoin", "groupBy"];
    const node: any = {
        then: (resolve: (value: unknown) => void, reject?: (reason?: unknown) => void) => Promise.resolve(result).then(resolve, reject),
        catch: (reject: (reason?: unknown) => void) => Promise.resolve(result).catch(reject),
    };
    for (const method of methods) {
        node[method] = mock(() => node);
    }
    return node;
}

/**
 * Creates a fake `db` (the Drizzle instance exported by `src/libs/db.ts`).
 * `select`/`insert`/`update`/`delete` are each a fresh `mock()` so a test
 * can queue up per-call results with `mockImplementationOnce(() =>
 * chain(...))` for methods that run more than one query. `transaction`
 * just invokes its callback with the same fake db, matching how services
 * use `db.transaction(async (tx) => ...)`.
 */
export function createMockDb() {
    const db: any = {
        select: mock(() => chain([])),
        insert: mock(() => chain([])),
        update: mock(() => chain([])),
        delete: mock(() => chain([])),
    };
    db.transaction = mock(async (fn: (tx: unknown) => unknown) => fn(db));
    return db;
}
