import { describe, it, expect, mock, beforeEach } from "bun:test";
import { CampaignController } from "../../src/controllers";
import type { CampaignService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("CampaignController", () => {
    let campaignService: CampaignService;
    let controller: CampaignController;

    const campaign = { id: "campaign-1", organization_id: "org-1", name: "Launch", status: "draft", start_time: null };

    beforeEach(() => {
        campaignService = {
            getByOrganization: mock(async () => [campaign]),
            create: mock(async () => campaign),
            getById: mock(async () => campaign),
            update: mock(async () => campaign),
            delete: mock(async () => campaign),
        } as unknown as CampaignService;

        controller = new CampaignController(campaignService);
    });

    describe("getAll", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAll(ctx), 400, "organizationId");
        });

        it("passes the status filter and pagination through to the service", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, query: { status: "scheduled", limit: "5", offset: "0" } });
            const result: any = await controller.getAll(ctx);

            expect(campaignService.getByOrganization).toHaveBeenCalledWith("org-1", { status: "scheduled", limit: 5, offset: 0 });
            expect(result.body).toEqual([campaign]);
        });
    });

    describe("post", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.post(ctx), 400, "organizationId");
        });

        it("creates a campaign scoped to the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { name: "Launch" } });
            const result: any = await controller.post(ctx);

            expect(campaignService.create).toHaveBeenCalledWith({ name: "Launch", organization_id: "org-1" });
            expect(result.status).toBe(201);
            expect(result.body).toEqual(campaign);
        });

        it("coerces a valid start_time string into a Date before creating", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { name: "Launch", start_time: "2026-09-01T12:00:00.000Z" } });
            await controller.post(ctx);

            const createArg = (campaignService.create as any).mock.calls[0][0];
            expect(createArg.start_time).toBeInstanceOf(Date);
            expect(createArg.start_time.toISOString()).toBe("2026-09-01T12:00:00.000Z");
        });

        it("400s when start_time is not a valid date string", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { name: "Launch", start_time: "not-a-date" } });
            await expectHttpException(controller.post(ctx), 400, "Invalid start_time");
        });
    });

    describe("get", () => {
        it("400s when the campaign_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "campaignId");
        });

        it("404s when the campaign doesn't exist", async () => {
            (campaignService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { campaign_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Campaign not found");
        });

        it("returns the campaign on success", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" } });
            const result: any = await controller.get(ctx);
            expect(campaignService.getById).toHaveBeenCalledWith("campaign-1");
            expect(result.body).toEqual(campaign);
        });
    });

    describe("update", () => {
        it("400s when the campaign_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "campaignId");
        });

        it("404s when the campaign doesn't exist", async () => {
            (campaignService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { campaign_id: "missing" }, body: { name: "New" } });
            await expectHttpException(controller.update(ctx), 404, "Campaign not found");
        });

        it("400s when start_time is not a valid date string", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" }, body: { start_time: "not-a-date" } });
            await expectHttpException(controller.update(ctx), 400, "Invalid start_time");
        });

        it("allows clearing start_time with null", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" }, body: { start_time: null } });
            await controller.update(ctx);
            expect(campaignService.update).toHaveBeenCalledWith("campaign-1", { start_time: null });
        });

        it("updates and returns the campaign", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" }, body: { name: "New" } });
            const result: any = await controller.update(ctx);
            expect(campaignService.update).toHaveBeenCalledWith("campaign-1", { name: "New" });
            expect(result.body).toEqual(campaign);
        });
    });

    describe("delete", () => {
        it("400s when the campaign_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "campaignId");
        });

        it("404s when the campaign doesn't exist", async () => {
            (campaignService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { campaign_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Campaign not found");
        });

        it("deletes and returns the campaign", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" } });
            const result: any = await controller.delete(ctx);
            expect(campaignService.delete).toHaveBeenCalledWith("campaign-1");
            expect(result.body).toEqual(campaign);
        });
    });
});
