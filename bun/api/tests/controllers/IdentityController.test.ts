import { describe, it, expect, mock, beforeEach } from "bun:test";
import { IdentityController } from "../../src/controllers";
import type { IdentityService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("IdentityController", () => {
    let identityService: IdentityService;
    let controller: IdentityController;

    const identity = { id: "identity-1", organization_id: "org-1", type: "email", identity: "sender@example.com", status: "pending" };

    beforeEach(() => {
        identityService = {
            getByOrganization: mock(async () => [identity]),
            create: mock(async () => identity),
            getById: mock(async () => identity),
            update: mock(async () => identity),
            delete: mock(async () => identity),
        } as unknown as IdentityService;

        controller = new IdentityController(identityService);
    });

    describe("getAll", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAll(ctx), 400, "organizationId");
        });

        it("passes type/status filters and pagination through to the service", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, query: { type: "email", status: "active", limit: "5", offset: "0" } });
            const result: any = await controller.getAll(ctx);

            expect(identityService.getByOrganization).toHaveBeenCalledWith("org-1", { type: "email", status: "active", limit: 5, offset: 0 });
            expect(result.body).toEqual([identity]);
        });
    });

    describe("post", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.post(ctx), 400, "organizationId");
        });

        it("creates an identity scoped to the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { type: "email", identity: "sender@example.com" } });
            const result: any = await controller.post(ctx);

            expect(identityService.create).toHaveBeenCalledWith({ type: "email", identity: "sender@example.com", organization_id: "org-1" });
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
        it("400s when the identity_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "identityId");
        });

        it("404s when the identity doesn't exist", async () => {
            (identityService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { identity_id: "missing" }, body: { status: "active" } });
            await expectHttpException(controller.update(ctx), 404, "Identity not found");
        });

        it("updates and returns the identity", async () => {
            const ctx = createMockContext({ params: { identity_id: "identity-1" }, body: { status: "active" } });
            const result: any = await controller.update(ctx);
            expect(identityService.update).toHaveBeenCalledWith("identity-1", { status: "active" });
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
