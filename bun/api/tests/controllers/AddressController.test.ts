import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AddressController } from "../../src/controllers";
import type { AddressService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("AddressController", () => {
    let addressService: AddressService;
    let controller: AddressController;

    const address = { id: "address-1", organization_id: "org-1", user_id: "user-1", is_primary: true, line1: "1 Infinite Loop" };

    beforeEach(() => {
        addressService = {
            getByUser: mock(async () => [address]),
            getByOrganization: mock(async () => [address]),
            create: mock(async () => address),
            getById: mock(async () => address),
            update: mock(async () => address),
            delete: mock(async () => address),
        } as unknown as AddressService;

        controller = new AddressController(addressService);
    });

    describe("getAll", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAll(ctx), 400, "organizationId");
        });

        it("scopes to a single user when user_id is given", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, query: { user_id: "user-1", limit: "5", offset: "0" } });
            const result: any = await controller.getAll(ctx);

            expect(addressService.getByUser).toHaveBeenCalledWith("user-1", { limit: 5, offset: 0 });
            expect(addressService.getByOrganization).not.toHaveBeenCalled();
            expect(result.body).toEqual([address]);
        });

        it("lists by organization and parses is_primary when no user_id is given", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, query: { is_primary: "true" } });
            const result: any = await controller.getAll(ctx);

            expect(addressService.getByOrganization).toHaveBeenCalledWith("org-1", { isPrimary: true, limit: undefined, offset: undefined });
            expect(result.body).toEqual([address]);
        });
    });

    describe("post", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.post(ctx), 400, "organizationId");
        });

        it("creates an address scoped to the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { line1: "1 Infinite Loop" } });
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
