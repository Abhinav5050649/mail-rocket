import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AddressController } from "../../src/controllers";
import type { AddressService, OrganizationService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("AddressController", () => {
    let addressService: AddressService;
    let organizationService: OrganizationService;
    let controller: AddressController;

    const address = { id: "address-1", organization_id: "org-1", is_primary: true, line1: "1 Infinite Loop" };

    beforeEach(() => {
        addressService = {
            getByOrganization: mock(async () => [address]),
            create: mock(async () => address),
            getById: mock(async () => address),
            update: mock(async () => address),
            delete: mock(async () => address),
        } as unknown as AddressService;

        organizationService = {
            get: mock(async () => ({ id: "org-1", name: "Acme" })),
        } as unknown as OrganizationService;

        controller = new AddressController(addressService, organizationService);
    });

    describe("getAll", () => {
        it("404s when the organization hasn't been seeded", async () => {
            (organizationService.get as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({});
            await expectHttpException(controller.getAll(ctx), 404, "Organization not found");
        });

        it("lists the organization's addresses and parses is_primary", async () => {
            const ctx = createMockContext({ query: { is_primary: "true" } });
            const result: any = await controller.getAll(ctx);

            expect(addressService.getByOrganization).toHaveBeenCalledWith("org-1", { isPrimary: true, limit: undefined, offset: undefined });
            expect(result.body).toEqual([address]);
        });
    });

    describe("post", () => {
        it("404s when the organization hasn't been seeded", async () => {
            (organizationService.get as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ body: {} });
            await expectHttpException(controller.post(ctx), 404, "Organization not found");
        });

        it("creates an address linked to the organization", async () => {
            const ctx = createMockContext({ body: { line1: "1 Infinite Loop" } });
            const result: any = await controller.post(ctx);

            expect(addressService.create).toHaveBeenCalledWith({ line1: "1 Infinite Loop", organization_id: "org-1" });
            expect(result.status).toBe(201);
            expect(result.body).toEqual(address);
        });
    });

    describe("get", () => {
        it("400s when the address_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "addressId");
        });

        it("404s when the address doesn't exist", async () => {
            (addressService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { address_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Address not found");
        });

        it("returns the address on success", async () => {
            const ctx = createMockContext({ params: { address_id: "address-1" } });
            const result: any = await controller.get(ctx);
            expect(addressService.getById).toHaveBeenCalledWith("address-1");
            expect(result.body).toEqual(address);
        });
    });

    describe("update", () => {
        it("400s when the address_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "addressId");
        });

        it("404s when the address doesn't exist", async () => {
            (addressService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { address_id: "missing" }, body: { line1: "New" } });
            await expectHttpException(controller.update(ctx), 404, "Address not found");
        });

        it("updates and returns the address", async () => {
            const ctx = createMockContext({ params: { address_id: "address-1" }, body: { line1: "New" } });
            const result: any = await controller.update(ctx);
            expect(addressService.update).toHaveBeenCalledWith("address-1", { line1: "New" });
            expect(result.body).toEqual(address);
        });
    });

    describe("delete", () => {
        it("400s when the address_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "addressId");
        });

        it("404s when the address doesn't exist", async () => {
            (addressService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { address_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Address not found");
        });

        it("deletes and returns the address", async () => {
            const ctx = createMockContext({ params: { address_id: "address-1" } });
            const result: any = await controller.delete(ctx);
            expect(addressService.delete).toHaveBeenCalledWith("address-1");
            expect(result.body).toEqual(address);
        });
    });
});
