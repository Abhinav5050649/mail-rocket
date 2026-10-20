import { describe, it, expect, mock, beforeEach } from "bun:test";
import { OrganizationController } from "../../src/controllers";
import type { OrganizationService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("OrganizationController", () => {
    let organizationService: OrganizationService;
    let controller: OrganizationController;

    const organization = { id: "org-1", name: "Acme", description: null };

    beforeEach(() => {
        organizationService = {
            get: mock(async () => organization),
            update: mock(async () => organization),
        } as unknown as OrganizationService;

        controller = new OrganizationController(organizationService);
    });

    describe("get", () => {
        it("404s when the organization hasn't been seeded", async () => {
            (organizationService.get as any).mockImplementationOnce(async () => null);
            await expectHttpException(controller.get(createMockContext()), 404, "Organization not found");
        });

        it("returns the organization", async () => {
            const result: any = await controller.get(createMockContext());
            expect(result.body).toEqual(organization);
        });
    });

    describe("update", () => {
        it("404s when the organization hasn't been seeded", async () => {
            (organizationService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ body: { name: "New" } });
            await expectHttpException(controller.update(ctx), 404, "Organization not found");
        });

        it("400s on an unknown time zone without touching the row", async () => {
            const ctx = createMockContext({ body: { timezone: "Mars/Olympus_Mons" } });
            await expect(controller.update(ctx)).rejects.toThrow("Unknown time zone");
            expect(organizationService.update).not.toHaveBeenCalled();
        });

        it("accepts a valid IANA time zone", async () => {
            const ctx = createMockContext({ body: { timezone: "Asia/Kolkata" } });
            await controller.update(ctx);
            expect(organizationService.update).toHaveBeenCalledWith({ timezone: "Asia/Kolkata" });
        });

        it("updates and returns the organization", async () => {
            const ctx = createMockContext({ body: { name: "New" } });
            const result: any = await controller.update(ctx);
            expect(organizationService.update).toHaveBeenCalledWith({ name: "New" });
            expect(result.body).toEqual(organization);
        });
    });
});
