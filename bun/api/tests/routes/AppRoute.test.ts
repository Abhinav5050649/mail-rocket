import { describe, it, expect, mock, beforeEach } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";

/**
 * Drives real HTTP requests through `appRoute` - `authenticate`, then
 * `requireAbility`, then the controller - with only the Drizzle `db`
 * replaced. Proves the routes are wired to the right claims, which the
 * per-controller unit tests can't see.
 */
const mockDb = createMockDb();
mock.module("../../src/libs/db", () => ({ db: mockDb, connectDB: async () => {} }));

const { appRoute, claimsForPreset, errorHandler } = await import("../../src");
const { Hono } = await import("hono");

const app = new Hono().onError(errorHandler).route("/", appRoute);

/** Makes the next `api_key` lookup (the first select of a request) find a key with `claims`. */
const authenticateAs = (claims: readonly unknown[]) => {
    mockDb.select.mockImplementationOnce(() => chain([{ id: "key-1", name: "test", claims: [...claims], expires_at: null }]));
};

describe("appRoute", () => {
    beforeEach(() => {
        mockDb.select.mockReset();
        mockDb.select.mockImplementation(() => chain([]));
    });

    it("401s every route without a key", async () => {
        const res = await app.request("/campaigns");
        expect(res.status).toBe(401);
    });

    it("lets a viewer key read campaigns", async () => {
        authenticateAs(claimsForPreset.viewer);
        const res = await app.request("/campaigns", { headers: { authorization: "Bearer mr_test" } });
        expect(res.status).toBe(200);
    });

    it("403s a viewer key creating a campaign", async () => {
        authenticateAs(claimsForPreset.viewer);
        const res = await app.request("/campaigns", { method: "POST", headers: { "x-api-key": "mr_test" }, body: "{}" });
        expect(res.status).toBe(403);
    });

    it("403s an editor key updating the organization profile", async () => {
        authenticateAs(claimsForPreset.editor);
        const res = await app.request("/organization", { method: "PATCH", headers: { authorization: "Bearer mr_test" }, body: "{}" });
        expect(res.status).toBe(403);
    });

    it("403s an editor key creating a sending identity", async () => {
        authenticateAs(claimsForPreset.editor);
        const res = await app.request("/identities", { method: "POST", headers: { authorization: "Bearer mr_test" }, body: "{}" });
        expect(res.status).toBe(403);
    });

    it("lets an editor key read sending identities", async () => {
        authenticateAs(claimsForPreset.editor);
        const res = await app.request("/identities", { headers: { authorization: "Bearer mr_test" } });
        expect(res.status).toBe(200);
    });

    it("403s an editor key minting keys", async () => {
        authenticateAs(claimsForPreset.editor);
        const res = await app.request("/keys", { method: "POST", headers: { authorization: "Bearer mr_test" }, body: "{}" });
        expect(res.status).toBe(403);
    });

    it("serves /me to a key with no claims at all", async () => {
        authenticateAs([]);
        // `/me` re-reads the calling key by id after authenticating.
        mockDb.select.mockImplementationOnce(() => chain([{ id: "key-1", name: "test", claims: [], prefix: "mr_test", expires_at: null }]));
        const res = await app.request("/me", { headers: { authorization: "Bearer mr_test" } });
        expect(res.status).toBe(200);
        expect(((await res.json()) as { id: string }).id).toBe("key-1");
    });

    it("no longer serves the removed tenant-scoped routes", async () => {
        authenticateAs(claimsForPreset.admin);
        const res = await app.request("/organizations/org-1/campaigns", { headers: { authorization: "Bearer mr_test" } });
        expect(res.status).toBe(404);
    });
});
