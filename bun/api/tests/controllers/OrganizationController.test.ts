import { describe, it, expect, mock, beforeEach } from "bun:test";
import { OrganizationController } from "../../src/controllers";
import type { OrganizationService, OrganizationUserService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("OrganizationController", () => {
    let organizationService: OrganizationService;
    let organizationUserService: OrganizationUserService;
    let controller: OrganizationController;

    const organization = { id: "org-1", name: "Acme", normalized_name: "acme", description: null };

    beforeEach(() => {
        organizationService = {
            getAll: mock(async () => [organization]),
            create: mock(async () => organization),
            getById: mock(async () => organization),
            update: mock(async () => organization),
            delete: mock(async () => organization),
        } as unknown as OrganizationService;

        organizationUserService = {
            create: mock(async () => ({ id: "member-1", organization_id: organization.id, user_id: "user-1", role: "admin" })),
        } as unknown as OrganizationUserService;

        controller = new OrganizationController(organizationService, organizationUserService);
    });

    describe("getAll", () => {
        it("lists organizations with pagination params", async () => {
            const ctx = createMockContext({ query: { limit: "10", offset: "0" } });
            const result: any = await controller.getAll(ctx);

            expect(organizationService.getAll).toHaveBeenCalledWith({ limit: 10, offset: 0 });
            expect(result.body).toEqual([organization]);
        });
    });

    describe("post", () => {
        it("creates the organization and makes the caller its first admin", async () => {
            const ctx = createMockContext({ body: { name: "Acme" }, variables: { userId: "user-1" } });
            const result: any = await controller.post(ctx);

            expect(organizationService.create).toHaveBeenCalledWith({ name: "Acme" });
            expect(organizationUserService.create).toHaveBeenCalledWith({ organization_id: "org-1", user_id: "user-1", role: "admin" });
            expect(result.status).toBe(201);
            expect(result.body).toEqual(organization);
        });
    });

    describe("get", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "organizationId");
        });

        it("404s when the organization doesn't exist", async () => {
            (organizationService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { organization_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Organization not found");
        });

        it("returns the organization on success", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" } });
            const result: any = await controller.get(ctx);
            expect(organizationService.getById).toHaveBeenCalledWith("org-1");
            expect(result.body).toEqual(organization);
        });
    });

    describe("update", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "organizationId");
        });

        it("404s when the organization doesn't exist", async () => {
            (organizationService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { organization_id: "missing" }, body: { name: "New" } });
            await expectHttpException(controller.update(ctx), 404, "Organization not found");
        });

        it("updates and returns the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { name: "New" } });
            const result: any = await controller.update(ctx);
            expect(organizationService.update).toHaveBeenCalledWith("org-1", { name: "New" });
            expect(result.body).toEqual(organization);
        });
    });

    describe("delete", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "organizationId");
        });

        it("404s when the organization doesn't exist", async () => {
            (organizationService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { organization_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Organization not found");
        });

        it("deletes and returns the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" } });
            const result: any = await controller.delete(ctx);
            expect(organizationService.delete).toHaveBeenCalledWith("org-1");
            expect(result.body).toEqual(organization);
        });
    });
});
