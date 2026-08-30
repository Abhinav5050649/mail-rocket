import { describe, it, expect, mock, beforeEach } from "bun:test";
import { GroupController } from "../../src/controllers";
import type { GroupService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("GroupController", () => {
    let groupService: GroupService;
    let controller: GroupController;

    const group = { id: "group-1", organization_id: "org-1", campaign_id: "campaign-1", name: "VIP" };

    beforeEach(() => {
        groupService = {
            getByOrganization: mock(async () => [group]),
            create: mock(async () => group),
            getByCampaign: mock(async () => [group]),
            getById: mock(async () => group),
            update: mock(async () => group),
            delete: mock(async () => group),
        } as unknown as GroupService;

        controller = new GroupController(groupService);
    });

    describe("getAll", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAll(ctx), 400, "organizationId");
        });

        it("lists groups for the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, query: { limit: "10", offset: "0" } });
            const result: any = await controller.getAll(ctx);
            expect(groupService.getByOrganization).toHaveBeenCalledWith("org-1", { limit: 10, offset: 0 });
            expect(result.body).toEqual([group]);
        });
    });

    describe("post", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.post(ctx), 400, "organizationId");
        });

        it("creates a group scoped to the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { name: "VIP" } });
            const result: any = await controller.post(ctx);
            expect(groupService.create).toHaveBeenCalledWith({ name: "VIP", organization_id: "org-1" });
            expect(result.status).toBe(201);
            expect(result.body).toEqual(group);
        });
    });

    describe("getAllByCampaign", () => {
        it("400s when the campaign_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAllByCampaign(ctx), 400, "campaignId");
        });

        it("lists groups for the campaign", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" } });
            const result: any = await controller.getAllByCampaign(ctx);
            expect(groupService.getByCampaign).toHaveBeenCalledWith("campaign-1", { limit: undefined, offset: undefined });
            expect(result.body).toEqual([group]);
        });
    });

    describe("postByCampaign", () => {
        it("400s when a route param is missing", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: {} });
            await expectHttpException(controller.postByCampaign(ctx), 400, "campaignId");
        });

        it("creates a group scoped to the organization and campaign", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1", campaign_id: "campaign-1" }, body: { name: "VIP" } });
            const result: any = await controller.postByCampaign(ctx);
            expect(groupService.create).toHaveBeenCalledWith({ name: "VIP", organization_id: "org-1", campaign_id: "campaign-1" });
            expect(result.status).toBe(201);
        });
    });

    describe("get", () => {
        it("400s when the group_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "groupId");
        });

        it("404s when the group doesn't exist", async () => {
            (groupService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { group_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Group not found");
        });

        it("returns the group on success", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1" } });
            const result: any = await controller.get(ctx);
            expect(groupService.getById).toHaveBeenCalledWith("group-1");
            expect(result.body).toEqual(group);
        });
    });

    describe("update", () => {
        it("400s when the group_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "groupId");
        });

        it("404s when the group doesn't exist", async () => {
            (groupService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { group_id: "missing" }, body: { name: "New" } });
            await expectHttpException(controller.update(ctx), 404, "Group not found");
        });

        it("updates and returns the group", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1" }, body: { name: "New" } });
            const result: any = await controller.update(ctx);
            expect(groupService.update).toHaveBeenCalledWith("group-1", { name: "New" });
            expect(result.body).toEqual(group);
        });
    });

    describe("delete", () => {
        it("400s when the group_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "groupId");
        });

        it("404s when the group doesn't exist", async () => {
            (groupService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { group_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Group not found");
        });

        it("deletes and returns the group", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1" } });
            const result: any = await controller.delete(ctx);
            expect(groupService.delete).toHaveBeenCalledWith("group-1");
            expect(result.body).toEqual(group);
        });
    });
});
