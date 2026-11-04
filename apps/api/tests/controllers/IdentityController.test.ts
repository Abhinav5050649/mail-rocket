import { describe, it, expect, mock, beforeEach } from "bun:test";
import { IdentityController } from "../../src/controllers";
import type { IdentityService } from "../../src/services";
import { ValidationError } from "../../src/libs";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("IdentityController", () => {
    let identityService: IdentityService;
    let controller: IdentityController;

    const identity = { id: "identity-1", type: "email", identity: "sender@example.com", status: "pending" };

    beforeEach(() => {
        identityService = {
            getAll: mock(async () => [identity]),
            create: mock(async () => identity),
            getById: mock(async () => identity),
            update: mock(async () => identity),
            delete: mock(async () => identity),
        } as unknown as IdentityService;

        controller = new IdentityController(identityService);
    });

    describe("getAll", () => {
        it("passes type/status filters and pagination through to the service", async () => {
            const ctx = createMockContext({ query: { type: "email", status: "active", limit: "5", offset: "0" } });
            const result: any = await controller.getAll(ctx);

            expect(identityService.getAll).toHaveBeenCalledWith({ type: "email", status: "active", limit: 5, offset: 0 });
            expect(result.body).toEqual([identity]);
        });
    });

    describe("post", () => {
        it("400s when the body sets status, which SES verification owns", async () => {
            const ctx = createMockContext({ body: { type: "email", identity: "sender@example.com", status: "active" } });
            await expect(controller.post(ctx)).rejects.toThrow(ValidationError);
            expect(identityService.create).not.toHaveBeenCalled();
        });

        it("creates an identity", async () => {
            const ctx = createMockContext({ body: { type: "email", identity: "sender@example.com" } });
            const result: any = await controller.post(ctx);

            expect(identityService.create).toHaveBeenCalledWith({ type: "email", identity: "sender@example.com" });
            expect(result.status).toBe(201);
            expect(result.body).toEqual(identity);
        });
    });

    describe("get", () => {
        it("400s when the identity_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "identityId");
        });

        it("404s when the identity doesn't exist", async () => {
            (identityService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { identity_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Identity not found");
        });

        it("returns the identity on success", async () => {
            const ctx = createMockContext({ params: { identity_id: "identity-1" } });
            const result: any = await controller.get(ctx);
            expect(identityService.getById).toHaveBeenCalledWith("identity-1");
            expect(result.body).toEqual(identity);
        });
    });

    describe("update", () => {
        it("400s on anything but description - status, or a new address SES never verified", async () => {
            for (const body of [{ status: "active" }, { identity: "other@example.com" }, { type: "domain" }, { verification_records: [] }]) {
                const ctx = createMockContext({ params: { identity_id: "identity-1" }, body });
                await expect(controller.update(ctx)).rejects.toThrow(ValidationError);
            }
            expect(identityService.update).not.toHaveBeenCalled();
        });

        it("400s when the identity_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "identityId");
        });

        it("404s when the identity doesn't exist", async () => {
            (identityService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { identity_id: "missing" }, body: { description: "Primary sender" } });
            await expectHttpException(controller.update(ctx), 404, "Identity not found");
        });

        it("updates and returns the identity", async () => {
            const ctx = createMockContext({ params: { identity_id: "identity-1" }, body: { description: "Primary sender" } });
            const result: any = await controller.update(ctx);
            expect(identityService.update).toHaveBeenCalledWith("identity-1", { description: "Primary sender" });
            expect(result.body).toEqual(identity);
        });
    });

    describe("delete", () => {
        it("400s when the identity_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "identityId");
        });

        it("404s when the identity doesn't exist", async () => {
            (identityService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { identity_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Identity not found");
        });

        it("deletes and returns the identity", async () => {
            const ctx = createMockContext({ params: { identity_id: "identity-1" } });
            const result: any = await controller.delete(ctx);
            expect(identityService.delete).toHaveBeenCalledWith("identity-1");
            expect(result.body).toEqual(identity);
        });
    });
});
