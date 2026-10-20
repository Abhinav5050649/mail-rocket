import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ApiKeyController } from "../../src/controllers";
import type { ApiKeyService } from "../../src/services";
import { claimsForPreset, defineAbility, type Claim } from "../../src/libs";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

/** A `principal` context variable, as `authenticate` would set it. */
const principalFor = (keyId: string, claims: readonly Claim[]) => ({
    principal: { keyId, name: keyId, claims: [...claims], ability: defineAbility(claims) },
});

describe("ApiKeyController", () => {
    let apiKeyService: ApiKeyService;
    let controller: ApiKeyController;

    const row = {
        id: "key-2",
        entity: "mail_rocket.api_key",
        name: "ci",
        claims: [...claimsForPreset.editor],
        key_hash: "deadbeef",
        prefix: "mr_abcdefghi",
        expires_at: null,
        description: null,
        created_at: new Date("2026-10-01T00:00:00Z"),
        updated_at: null,
    };

    beforeEach(() => {
        apiKeyService = {
            getById: mock(async () => row),
            getAll: mock(async () => [row]),
            create: mock(async () => ({ apiKey: row, secret: "mr_secret" })),
            update: mock(async () => row),
            delete: mock(async () => row),
        } as unknown as ApiKeyService;

        controller = new ApiKeyController(apiKeyService);
    });

    describe("me", () => {
        it("returns the calling key without its hash, naming its preset", async () => {
            const ctx = createMockContext({ variables: principalFor("key-2", claimsForPreset.editor) });
            const result: any = await controller.me(ctx);

            expect(apiKeyService.getById).toHaveBeenCalledWith("key-2");
            expect(result.body.preset).toBe("editor");
            expect(result.body.key_hash).toBeUndefined();
        });
    });

    describe("getAll", () => {
        it("returns full keys to a caller that can manage keys", async () => {
            const ctx = createMockContext({ query: { limit: "5" }, variables: principalFor("key-1", claimsForPreset.admin) });
            const result: any = await controller.getAll(ctx);

            expect(apiKeyService.getAll).toHaveBeenCalledWith({ limit: 5, offset: undefined });
            expect(result.body[0].prefix).toBe("mr_abcdefghi");
            expect(result.body[0].key_hash).toBeUndefined();
        });

        it("returns only the summary shape to a caller that cannot manage keys", async () => {
            const ctx = createMockContext({ variables: principalFor("key-1", claimsForPreset.viewer) });
            const result: any = await controller.getAll(ctx);

            expect(result.body).toEqual([{ id: "key-2", name: "ci", claims: row.claims, preset: "editor" }]);
        });
    });

    describe("post", () => {
        it("400s when neither preset nor claims is given", async () => {
            const ctx = createMockContext({ body: { name: "ci" } });
            await expectHttpException(controller.post(ctx), 400, "exactly one of preset or claims");
        });

        it("400s on a claim using CASL's manage wildcard", async () => {
            const ctx = createMockContext({ body: { name: "ci", claims: [{ action: "manage", subject: "all" }] } });
            await expectHttpException(controller.post(ctx), 400);
        });

        it("400s on a claim carrying conditions", async () => {
            const ctx = createMockContext({ body: { name: "ci", claims: [{ action: "read", subject: "Campaign", conditions: { id: "x" } }] } });
            await expectHttpException(controller.post(ctx), 400);
        });

        it("expands a preset and returns the secret once", async () => {
            const ctx = createMockContext({ body: { name: "ci", preset: "editor", expires_at: "2027-01-01T00:00:00Z" } });
            const result: any = await controller.post(ctx);

            expect(apiKeyService.create).toHaveBeenCalledWith({
                name: "ci",
                claims: [...claimsForPreset.editor],
                expires_at: new Date("2027-01-01T00:00:00Z"),
                description: undefined,
            });
            expect(result.status).toBe(201);
            expect(result.body.secret).toBe("mr_secret");
        });

        it("accepts an explicit claim list", async () => {
            const claims = [{ action: "read", subject: "Campaign" }];
            const ctx = createMockContext({ body: { name: "reader", claims } });
            await controller.post(ctx);

            expect((apiKeyService.create as any).mock.calls[0][0].claims).toEqual(claims);
        });
    });

    describe("get", () => {
        it("400s when the key_id param is missing", async () => {
            await expectHttpException(controller.get(createMockContext()), 400, "keyId");
        });

        it("404s when the key doesn't exist", async () => {
            (apiKeyService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { key_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "API key not found");
        });
    });

    describe("update", () => {
        it("403s when a key tries to change its own claims", async () => {
            const ctx = createMockContext({ params: { key_id: "key-1" }, body: { preset: "viewer" }, variables: principalFor("key-1", claimsForPreset.admin) });
            await expectHttpException(controller.update(ctx), 403, "claims of the key you are using");
            expect(apiKeyService.update).not.toHaveBeenCalled();
        });

        it("lets a key rename itself", async () => {
            const ctx = createMockContext({ params: { key_id: "key-1" }, body: { name: "renamed" }, variables: principalFor("key-1", claimsForPreset.admin) });
            await controller.update(ctx);
            expect(apiKeyService.update).toHaveBeenCalledWith("key-1", { name: "renamed", claims: undefined, expires_at: undefined, description: undefined });
        });

        it("400s when both preset and claims are given", async () => {
            const ctx = createMockContext({ params: { key_id: "key-2" }, body: { preset: "viewer", claims: [] }, variables: principalFor("key-1", claimsForPreset.admin) });
            await expectHttpException(controller.update(ctx), 400, "not both");
        });

        it("clears expiry when expires_at is null", async () => {
            const ctx = createMockContext({ params: { key_id: "key-2" }, body: { expires_at: null }, variables: principalFor("key-1", claimsForPreset.admin) });
            await controller.update(ctx);
            expect((apiKeyService.update as any).mock.calls[0][1].expires_at).toBeNull();
        });
    });

    describe("delete", () => {
        it("403s when a key tries to revoke itself", async () => {
            const ctx = createMockContext({ params: { key_id: "key-1" }, variables: principalFor("key-1", claimsForPreset.admin) });
            await expectHttpException(controller.delete(ctx), 403, "revoke the key you are using");
            expect(apiKeyService.delete).not.toHaveBeenCalled();
        });

        it("404s when the key doesn't exist", async () => {
            (apiKeyService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { key_id: "missing" }, variables: principalFor("key-1", claimsForPreset.admin) });
            await expectHttpException(controller.delete(ctx), 404, "API key not found");
        });

        it("revokes another key", async () => {
            const ctx = createMockContext({ params: { key_id: "key-2" }, variables: principalFor("key-1", claimsForPreset.admin) });
            await controller.delete(ctx);
            expect(apiKeyService.delete).toHaveBeenCalledWith("key-2");
        });
    });
});
