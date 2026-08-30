import { describe, it, expect, mock, beforeEach } from "bun:test";
import { TemplateController } from "../../src/controllers";
import type { TemplateService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("TemplateController", () => {
    let templateService: TemplateService;
    let controller: TemplateController;

    const template = { id: "template-1", organization_id: "org-1", campaign_id: "campaign-1", html_body: "<p>Hi</p>" };

    beforeEach(() => {
        templateService = {
            getByOrganization: mock(async () => [template]),
            create: mock(async () => template),
            getByCampaign: mock(async () => [template]),
            getById: mock(async () => template),
            update: mock(async () => template),
            delete: mock(async () => template),
        } as unknown as TemplateService;

        controller = new TemplateController(templateService);
    });

    describe("getAll", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAll(ctx), 400, "organizationId");
        });

        it("lists templates for the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, query: { limit: "10", offset: "0" } });
            const result: any = await controller.getAll(ctx);
            expect(templateService.getByOrganization).toHaveBeenCalledWith("org-1", { limit: 10, offset: 0 });
            expect(result.body).toEqual([template]);
        });
    });

    describe("post", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.post(ctx), 400, "organizationId");
        });

        it("creates a template scoped to the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { html_body: "<p>Hi</p>" } });
            const result: any = await controller.post(ctx);
            expect(templateService.create).toHaveBeenCalledWith({ html_body: "<p>Hi</p>", organization_id: "org-1" });
            expect(result.status).toBe(201);
            expect(result.body).toEqual(template);
        });
    });

    describe("getAllByCampaign", () => {
        it("400s when the campaign_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAllByCampaign(ctx), 400, "campaignId");
        });

        it("lists templates for the campaign", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" } });
            const result: any = await controller.getAllByCampaign(ctx);
            expect(templateService.getByCampaign).toHaveBeenCalledWith("campaign-1", { limit: undefined, offset: undefined });
            expect(result.body).toEqual([template]);
        });
    });

    describe("postByCampaign", () => {
        it("400s when a route param is missing", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: {} });
            await expectHttpException(controller.postByCampaign(ctx), 400, "campaignId");
        });

        it("creates a template scoped to the organization and campaign", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1", campaign_id: "campaign-1" }, body: { html_body: "<p>Hi</p>" } });
            const result: any = await controller.postByCampaign(ctx);
            expect(templateService.create).toHaveBeenCalledWith({ html_body: "<p>Hi</p>", organization_id: "org-1", campaign_id: "campaign-1" });
            expect(result.status).toBe(201);
        });
    });

    describe("get", () => {
        it("400s when the template_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "templateId");
        });

        it("404s when the template doesn't exist", async () => {
            (templateService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { template_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Template not found");
        });

        it("returns the template on success", async () => {
            const ctx = createMockContext({ params: { template_id: "template-1" } });
            const result: any = await controller.get(ctx);
            expect(templateService.getById).toHaveBeenCalledWith("template-1");
            expect(result.body).toEqual(template);
        });
    });

    describe("update", () => {
        it("400s when the template_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "templateId");
        });

        it("404s when the template doesn't exist", async () => {
            (templateService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { template_id: "missing" }, body: { html_body: "<p>New</p>" } });
            await expectHttpException(controller.update(ctx), 404, "Template not found");
        });

        it("updates and returns the template", async () => {
            const ctx = createMockContext({ params: { template_id: "template-1" }, body: { html_body: "<p>New</p>" } });
            const result: any = await controller.update(ctx);
            expect(templateService.update).toHaveBeenCalledWith("template-1", { html_body: "<p>New</p>" });
            expect(result.body).toEqual(template);
        });
    });

    describe("delete", () => {
        it("400s when the template_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "templateId");
        });

        it("404s when the template doesn't exist", async () => {
            (templateService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { template_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Template not found");
        });

        it("deletes and returns the template", async () => {
            const ctx = createMockContext({ params: { template_id: "template-1" } });
            const result: any = await controller.delete(ctx);
            expect(templateService.delete).toHaveBeenCalledWith("template-1");
            expect(result.body).toEqual(template);
        });
    });
});
