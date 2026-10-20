import { describe, it, expect, mock, beforeEach } from "bun:test";
import { RecipientController } from "../../src/controllers";
import type { RecipientService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("RecipientController", () => {
    let recipientService: RecipientService;
    let controller: RecipientController;

    const recipient = { id: "recipient-1", campaign_id: "campaign-1", group_id: "group-1", email_id: "person@example.com" };

    beforeEach(() => {
        recipientService = {
            getAll: mock(async () => [recipient]),
            create: mock(async () => recipient),
            getByCampaign: mock(async () => [recipient]),
            getByGroup: mock(async () => [recipient]),
            getById: mock(async () => recipient),
            update: mock(async () => recipient),
            delete: mock(async () => recipient),
        } as unknown as RecipientService;

        controller = new RecipientController(recipientService);
    });

    describe("getAll", () => {
        it("lists recipients", async () => {
            const ctx = createMockContext({ query: { limit: "10", offset: "0" } });
            const result: any = await controller.getAll(ctx);
            expect(recipientService.getAll).toHaveBeenCalledWith({ limit: 10, offset: 0 });
            expect(result.body).toEqual([recipient]);
        });
    });

    describe("post", () => {
        it("creates a recipient", async () => {
            const ctx = createMockContext({ body: { email_id: "person@example.com" } });
            const result: any = await controller.post(ctx);
            expect(recipientService.create).toHaveBeenCalledWith({ email_id: "person@example.com" });
            expect(result.status).toBe(201);
        });
    });

    describe("getAllByCampaign", () => {
        it("400s when the campaign_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAllByCampaign(ctx), 400, "campaignId");
        });

        it("lists recipients for the campaign", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" } });
            const result: any = await controller.getAllByCampaign(ctx);
            expect(recipientService.getByCampaign).toHaveBeenCalledWith("campaign-1", { limit: undefined, offset: undefined });
            expect(result.body).toEqual([recipient]);
        });
    });

    describe("postByCampaign", () => {
        it("400s when a route param is missing", async () => {
            const ctx = createMockContext({ body: {} });
            await expectHttpException(controller.postByCampaign(ctx), 400, "campaignId");
        });

        it("creates a recipient scoped to the campaign", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" }, body: { email_id: "person@example.com" } });
            const result: any = await controller.postByCampaign(ctx);
            expect(recipientService.create).toHaveBeenCalledWith({ email_id: "person@example.com", campaign_id: "campaign-1" });
            expect(result.status).toBe(201);
        });
    });

    describe("getAllByGroup", () => {
        it("400s when the group_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAllByGroup(ctx), 400, "groupId");
        });

        it("lists recipients for the group", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1" } });
            const result: any = await controller.getAllByGroup(ctx);
            expect(recipientService.getByGroup).toHaveBeenCalledWith("group-1", { limit: undefined, offset: undefined });
            expect(result.body).toEqual([recipient]);
        });
    });

    describe("postByGroup", () => {
        it("400s when a route param is missing", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" }, body: {} });
            await expectHttpException(controller.postByGroup(ctx), 400, "groupId");
        });

        it("creates a recipient scoped to the campaign and group", async () => {
            const ctx = createMockContext({
                params: { campaign_id: "campaign-1", group_id: "group-1" },
                body: { email_id: "person@example.com" },
            });
            const result: any = await controller.postByGroup(ctx);
            expect(recipientService.create).toHaveBeenCalledWith({
                email_id: "person@example.com",
                campaign_id: "campaign-1",
                group_id: "group-1",
            });
            expect(result.status).toBe(201);
        });
    });

    describe("get", () => {
        it("400s when the recipient_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "recipientId");
        });

        it("404s when the recipient doesn't exist", async () => {
            (recipientService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { recipient_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Recipient not found");
        });

        it("returns the recipient on success", async () => {
            const ctx = createMockContext({ params: { recipient_id: "recipient-1" } });
            const result: any = await controller.get(ctx);
            expect(recipientService.getById).toHaveBeenCalledWith("recipient-1");
            expect(result.body).toEqual(recipient);
        });
    });

    describe("update", () => {
        it("400s when the recipient_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "recipientId");
        });

        it("404s when the recipient doesn't exist", async () => {
            (recipientService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { recipient_id: "missing" }, body: { email_id: "new@example.com" } });
            await expectHttpException(controller.update(ctx), 404, "Recipient not found");
        });

        it("updates and returns the recipient", async () => {
            const ctx = createMockContext({ params: { recipient_id: "recipient-1" }, body: { email_id: "new@example.com" } });
            const result: any = await controller.update(ctx);
            expect(recipientService.update).toHaveBeenCalledWith("recipient-1", { email_id: "new@example.com" });
            expect(result.body).toEqual(recipient);
        });
    });

    describe("delete", () => {
        it("400s when the recipient_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "recipientId");
        });

        it("404s when the recipient doesn't exist", async () => {
            (recipientService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { recipient_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Recipient not found");
        });

        it("deletes and returns the recipient", async () => {
            const ctx = createMockContext({ params: { recipient_id: "recipient-1" } });
            const result: any = await controller.delete(ctx);
            expect(recipientService.delete).toHaveBeenCalledWith("recipient-1");
            expect(result.body).toEqual(recipient);
        });
    });
});
