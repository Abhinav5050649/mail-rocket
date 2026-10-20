import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ContactDetailsController } from "../../src/controllers";
import type { ContactDetailsService, OrganizationService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("ContactDetailsController", () => {
    let contactDetailsService: ContactDetailsService;
    let organizationService: OrganizationService;
    let controller: ContactDetailsController;

    const contactDetails = { id: "contact-1", organization_id: "org-1", phone: "+1-555-0100" };

    beforeEach(() => {
        contactDetailsService = {
            getByOrganization: mock(async () => [contactDetails]),
            create: mock(async () => contactDetails),
            getById: mock(async () => contactDetails),
            update: mock(async () => contactDetails),
            delete: mock(async () => contactDetails),
        } as unknown as ContactDetailsService;

        organizationService = {
            get: mock(async () => ({ id: "org-1", name: "Acme" })),
        } as unknown as OrganizationService;

        controller = new ContactDetailsController(contactDetailsService, organizationService);
    });

    describe("getAll", () => {
        it("404s when the organization hasn't been seeded", async () => {
            (organizationService.get as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({});
            await expectHttpException(controller.getAll(ctx), 404, "Organization not found");
        });

        it("lists the organization's contact details", async () => {
            const ctx = createMockContext({ query: { limit: "10", offset: "0" } });
            const result: any = await controller.getAll(ctx);

            expect(contactDetailsService.getByOrganization).toHaveBeenCalledWith("org-1", { limit: 10, offset: 0 });
            expect(result.body).toEqual([contactDetails]);
        });
    });

    describe("post", () => {
        it("404s when the organization hasn't been seeded", async () => {
            (organizationService.get as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ body: {} });
            await expectHttpException(controller.post(ctx), 404, "Organization not found");
        });

        it("creates a contact-details row linked to the organization", async () => {
            const ctx = createMockContext({ body: { phone: "+1-555-0100" } });
            const result: any = await controller.post(ctx);

            expect(contactDetailsService.create).toHaveBeenCalledWith({ phone: "+1-555-0100", organization_id: "org-1" });
            expect(result.status).toBe(201);
            expect(result.body).toEqual(contactDetails);
        });
    });

    describe("get", () => {
        it("400s when the contact_details_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "contactDetailsId");
        });

        it("404s when the row doesn't exist", async () => {
            (contactDetailsService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { contact_details_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Contact details not found");
        });

        it("returns the row on success", async () => {
            const ctx = createMockContext({ params: { contact_details_id: "contact-1" } });
            const result: any = await controller.get(ctx);
            expect(contactDetailsService.getById).toHaveBeenCalledWith("contact-1");
            expect(result.body).toEqual(contactDetails);
        });
    });

    describe("update", () => {
        it("400s when the contact_details_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "contactDetailsId");
        });

        it("404s when the row doesn't exist", async () => {
            (contactDetailsService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { contact_details_id: "missing" }, body: { phone: "New" } });
            await expectHttpException(controller.update(ctx), 404, "Contact details not found");
        });

        it("updates and returns the row", async () => {
            const ctx = createMockContext({ params: { contact_details_id: "contact-1" }, body: { phone: "New" } });
            const result: any = await controller.update(ctx);
            expect(contactDetailsService.update).toHaveBeenCalledWith("contact-1", { phone: "New" });
            expect(result.body).toEqual(contactDetails);
        });
    });

    describe("delete", () => {
        it("400s when the contact_details_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "contactDetailsId");
        });

        it("404s when the row doesn't exist", async () => {
            (contactDetailsService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { contact_details_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Contact details not found");
        });

        it("deletes and returns the row", async () => {
            const ctx = createMockContext({ params: { contact_details_id: "contact-1" } });
            const result: any = await controller.delete(ctx);
            expect(contactDetailsService.delete).toHaveBeenCalledWith("contact-1");
            expect(result.body).toEqual(contactDetails);
        });
    });
});
