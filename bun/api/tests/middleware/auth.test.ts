import { describe, it, expect, mock, beforeEach } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";

/**
 * `authenticate` looks keys up through `ApiKeyService`, which reads the
 * Drizzle `db` at call time - so the `db` module is replaced (not the
 * service, whose module-scope instance may already exist when the whole
 * suite runs in one process). Each test queues the `api_key` lookup result.
 */
const mockDb = createMockDb();
mock.module("../../src/libs/db", () => ({ db: mockDb, connectDB: async () => {} }));

const { claimsForPreset, defineAbility } = await import("../../src/libs");

const { authenticate, extractApiKey, requireAbility } = await import("../../src/middleware");
const { createMockContext, expectHttpException } = await import("../helpers/mockContext");

/** A context whose `c.req.header()` returns the given headers. */
const contextWithHeaders = (headers: Record<string, string>) => {
    const ctx = createMockContext();
    ctx.req.header = (name: string) => headers[name.toLowerCase()];
    return ctx;
};

describe("extractApiKey", () => {
    it("reads a Bearer token", () => {
        expect(extractApiKey("Bearer mr_abc", undefined)).toBe("mr_abc");
    });

    it("falls back to x-api-key when there is no Authorization header", () => {
        expect(extractApiKey(undefined, " mr_abc ")).toBe("mr_abc");
    });

    it("rejects a non-Bearer Authorization header rather than falling back", () => {
        expect(extractApiKey("Basic xyz", "mr_abc")).toBeNull();
    });
});

describe("authenticate", () => {
    const next = mock(async () => {});
    const row = { id: "key-1", name: "ops", claims: [...claimsForPreset.viewer], expires_at: null };

    beforeEach(() => {
        mockDb.select.mockReset();
        mockDb.select.mockImplementation(() => chain([]));
        next.mockClear();
    });

    it("401s when no key is presented", async () => {
        await expectHttpException(authenticate(contextWithHeaders({}), next), 401, "Missing API key");
        expect(next).not.toHaveBeenCalled();
    });

    it("401s when the key matches no stored key", async () => {
        await expectHttpException(authenticate(contextWithHeaders({ authorization: "Bearer mr_nope" }), next), 401, "Invalid API key");
    });

    it("401s when the key has expired", async () => {
        mockDb.select.mockImplementationOnce(() => chain([{ ...row, expires_at: new Date(Date.now() - 1000) }]));
        await expectHttpException(authenticate(contextWithHeaders({ "x-api-key": "mr_old" }), next), 401, "expired");
    });

    it("sets the principal, with its CASL ability, for a valid key", async () => {
        mockDb.select.mockImplementationOnce(() => chain([row]));
        const ctx = contextWithHeaders({ authorization: "Bearer mr_good" });
        await authenticate(ctx, next);

        const principal = ctx.set.mock.calls[0][1];
        expect(principal.keyId).toBe("key-1");
        expect(principal.ability.can("read", "Campaign")).toBe(true);
        expect(principal.ability.can("create", "Campaign")).toBe(false);
        expect(next).toHaveBeenCalled();
    });
});

describe("requireAbility", () => {
    const next = mock(async () => {});

    it("403s when the key's claims don't grant the action", async () => {
        const ctx = createMockContext({ variables: { principal: { ability: defineAbility(claimsForPreset.viewer) } } });
        await expectHttpException(requireAbility("delete", "Campaign")(ctx, next), 403, "cannot delete Campaign");
    });

    it("calls through when they do", async () => {
        const ctx = createMockContext({ variables: { principal: { ability: defineAbility(claimsForPreset.editor) } } });
        await requireAbility("delete", "Campaign")(ctx, next);
        expect(next).toHaveBeenCalled();
    });
});
