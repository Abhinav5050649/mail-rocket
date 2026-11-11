import { describe, it, expect, mock, beforeEach } from "bun:test";
import { SUBSCRIBER_BULK_MAX_IDS, SUBSCRIBER_IMPORT_MAX_ROWS } from "@mail-rocket/shared";
import { SubscriberController } from "../../src/controllers";
import type { SubscriberService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("SubscriberController", () => {
    let subscriberService: SubscriberService;
    let controller: SubscriberController;

    const subscriber = { id: "subscriber-1", campaign_id: "campaign-1", group_ids: ["group-1"], email_id: "person@example.com" };
    const importResult = { created: 1, existing: 0, group_ids: ["group-1"], skipped: [] };

    beforeEach(() => {
        subscriberService = {
            getAll: mock(async () => [subscriber]),
            create: mock(async () => subscriber),
            getByCampaign: mock(async () => [subscriber]),
            getByGroup: mock(async () => [subscriber]),
            addToGroup: mock(async () => subscriber),
            removeFromGroup: mock(async () => subscriber),
            getById: mock(async () => subscriber),
            update: mock(async () => subscriber),
            delete: mock(async () => subscriber),
            importMany: mock(async () => importResult),
        } as unknown as SubscriberService;

        controller = new SubscriberController(subscriberService);
    });

    describe("getAll", () => {
        it("lists subscribers", async () => {
            const ctx = createMockContext({ query: { limit: "10", offset: "0" } });
            const result: any = await controller.getAll(ctx);
            expect(subscriberService.getAll).toHaveBeenCalledWith({ limit: 10, offset: 0 });
            expect(result.body).toEqual([subscriber]);
        });
    });

    describe("post", () => {
        it("creates a subscriber", async () => {
            const ctx = createMockContext({ body: { email_id: "person@example.com" } });
            const result: any = await controller.post(ctx);
            expect(subscriberService.create).toHaveBeenCalledWith({ email_id: "person@example.com" });
            expect(result.status).toBe(201);
        });
    });

    describe("getAllByCampaign", () => {
        it("400s when the campaign_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAllByCampaign(ctx), 400, "campaignId");
        });

        it("lists subscribers for the campaign", async () => {
            const ctx = createMockContext({ params: { campaign_id: "campaign-1" } });
            const result: any = await controller.getAllByCampaign(ctx);
            expect(subscriberService.getByCampaign).toHaveBeenCalledWith("campaign-1", { limit: undefined, offset: undefined });
            expect(result.body).toEqual([subscriber]);
        });
    });

    describe("getAllByGroup", () => {
        it("400s when the group_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAllByGroup(ctx), 400, "groupId");
        });

        it("lists subscribers for the group", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1" } });
            const result: any = await controller.getAllByGroup(ctx);
            expect(subscriberService.getByGroup).toHaveBeenCalledWith("group-1", { limit: undefined, offset: undefined });
            expect(result.body).toEqual([subscriber]);
        });
    });

    describe("group_ids validation", () => {
        it("400s on the retired single group_id, pointing at group_ids", async () => {
            const ctx = createMockContext({ body: { email_id: "a@b.co", group_id: "group-1" } });
            await expect(controller.post(ctx)).rejects.toThrow("group_ids");
            expect(subscriberService.create).not.toHaveBeenCalled();
        });

        it("400s when group_ids isn't an array of strings", async () => {
            const ctx = createMockContext({ params: { subscriber_id: "subscriber-1" }, body: { group_ids: "group-1" } });
            await expect(controller.update(ctx)).rejects.toThrow("array");
            expect(subscriberService.update).not.toHaveBeenCalled();
        });
    });

    describe("addToGroup", () => {
        it("400s without a subscriber_id", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1" }, body: {} });
            await expectHttpException(controller.addToGroup(ctx), 400, "subscriber_id");
        });

        it("404s when the group or subscriber doesn't exist", async () => {
            (subscriberService.addToGroup as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { group_id: "group-1" }, body: { subscriber_id: "missing" } });
            await expectHttpException(controller.addToGroup(ctx), 404, "not found");
        });

        it("adds the subscriber and returns them", async () => {
            const ctx = createMockContext({ params: { group_id: "group-2" }, body: { subscriber_id: "subscriber-1" } });
            const result: any = await controller.addToGroup(ctx);
            expect(subscriberService.addToGroup).toHaveBeenCalledWith("group-2", "subscriber-1");
            expect(result.body).toEqual(subscriber);
        });
    });

    describe("removeFromGroup", () => {
        it("404s when the subscriber isn't in the group", async () => {
            (subscriberService.removeFromGroup as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { group_id: "group-9", subscriber_id: "subscriber-1" } });
            await expectHttpException(controller.removeFromGroup(ctx), 404, "not in this group");
        });

        it("removes the membership", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1", subscriber_id: "subscriber-1" } });
            await controller.removeFromGroup(ctx);
            expect(subscriberService.removeFromGroup).toHaveBeenCalledWith("group-1", "subscriber-1");
        });
    });

    describe("get", () => {
        it("400s when the subscriber_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "subscriberId");
        });

        it("404s when the subscriber doesn't exist", async () => {
            (subscriberService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { subscriber_id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "Subscriber not found");
        });

        it("returns the subscriber on success", async () => {
            const ctx = createMockContext({ params: { subscriber_id: "subscriber-1" } });
            const result: any = await controller.get(ctx);
            expect(subscriberService.getById).toHaveBeenCalledWith("subscriber-1");
            expect(result.body).toEqual(subscriber);
        });
    });

    describe("update", () => {
        it("400s when the subscriber_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "subscriberId");
        });

        it("404s when the subscriber doesn't exist", async () => {
            (subscriberService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { subscriber_id: "missing" }, body: { email_id: "new@example.com" } });
            await expectHttpException(controller.update(ctx), 404, "Subscriber not found");
        });

        it("updates and returns the subscriber", async () => {
            const ctx = createMockContext({ params: { subscriber_id: "subscriber-1" }, body: { email_id: "new@example.com" } });
            const result: any = await controller.update(ctx);
            expect(subscriberService.update).toHaveBeenCalledWith("subscriber-1", { email_id: "new@example.com" });
            expect(result.body).toEqual(subscriber);
        });

        it("400s when the body sets unsubscribed_at, which only the subscriber can set", async () => {
            const ctx = createMockContext({ params: { subscriber_id: "subscriber-1" }, body: { unsubscribed_at: null } });
            await expect(controller.update(ctx)).rejects.toThrow("unsubscribed_at is managed by the system");
            expect(subscriberService.update).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("400s when the subscriber_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "subscriberId");
        });

        it("404s when the subscriber doesn't exist", async () => {
            (subscriberService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { subscriber_id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "Subscriber not found");
        });

        it("deletes and returns the subscriber", async () => {
            const ctx = createMockContext({ params: { subscriber_id: "subscriber-1" } });
            const result: any = await controller.delete(ctx);
            expect(subscriberService.delete).toHaveBeenCalledWith("subscriber-1");
            expect(result.body).toEqual(subscriber);
        });
    });

    describe("importMany", () => {
        it("400s when subscribers is missing or empty", async () => {
            await expect(controller.importMany(createMockContext({ body: {} }))).rejects.toThrow("non-empty array");
            await expect(controller.importMany(createMockContext({ body: { subscribers: [] } }))).rejects.toThrow("non-empty array");
            expect(subscriberService.importMany).not.toHaveBeenCalled();
        });

        it("400s over the row limit", async () => {
            const rows = Array.from({ length: SUBSCRIBER_IMPORT_MAX_ROWS + 1 }, (_, i) => ({ email_id: `p${i}@example.com` }));
            await expect(controller.importMany(createMockContext({ body: { subscribers: rows } }))).rejects.toThrow("at most");
            expect(subscriberService.importMany).not.toHaveBeenCalled();
        });

        it("400s on malformed group_ids", async () => {
            const ctx = createMockContext({ body: { subscribers: [{ email_id: "a@b.co" }], group_ids: "group-1" } });
            await expect(controller.importMany(ctx)).rejects.toThrow("group_ids");
        });

        it("400s on a non-object row or a non-string field", async () => {
            await expect(controller.importMany(createMockContext({ body: { subscribers: ["a@b.co"] } }))).rejects.toThrow("subscribers[0]");
            await expect(controller.importMany(createMockContext({ body: { subscribers: [{ email_id: 42 }] } }))).rejects.toThrow("subscribers[0].email_id");
        });

        it("passes only the known fields and the groups to the service", async () => {
            const ctx = createMockContext({
                body: {
                    subscribers: [{ email_id: "a@b.co", first_name: "Ada", last_name: null, unsubscribed_at: "2026-01-01" }],
                    group_ids: ["group-1"],
                },
            });
            const result: any = await controller.importMany(ctx);
            expect(subscriberService.importMany).toHaveBeenCalledWith([{ email_id: "a@b.co", first_name: "Ada" }], ["group-1"]);
            expect(result.status).toBe(200);
            expect(result.body).toEqual(importResult);
        });

        it("defaults group_ids to none", async () => {
            const ctx = createMockContext({ body: { subscribers: [{ email_id: "a@b.co" }] } });
            await controller.importMany(ctx);
            expect(subscriberService.importMany).toHaveBeenCalledWith([{ email_id: "a@b.co" }], []);
        });
    });
});

describe("SubscriberController bulk endpoints", () => {
    let subscriberService: SubscriberService;
    let controller: SubscriberController;

    beforeEach(() => {
        subscriberService = {
            deleteMany: mock(async () => ({ deleted_ids: ["subscriber-1"], blocked_ids: ["subscriber-2"] })),
            removeManyFromGroup: mock(async () => ({ removed_ids: ["subscriber-1"] })),
        } as unknown as SubscriberService;
        controller = new SubscriberController(subscriberService);
    });

    describe("deleteMany", () => {
        it("400s on missing, empty or non-string subscriber_ids", async () => {
            for (const body of [{}, { subscriber_ids: [] }, { subscriber_ids: [1] }, { subscriber_ids: "subscriber-1" }]) {
                await expect(controller.deleteMany(createMockContext({ body }))).rejects.toThrow("subscriber_ids");
            }
            expect(subscriberService.deleteMany).not.toHaveBeenCalled();
        });

        it("400s over the id limit", async () => {
            const ids = Array.from({ length: SUBSCRIBER_BULK_MAX_IDS + 1 }, (_, i) => `subscriber-${i}`);
            await expect(controller.deleteMany(createMockContext({ body: { subscriber_ids: ids } }))).rejects.toThrow("At most");
        });

        it("deletes the subscribers and returns what happened", async () => {
            const result: any = await controller.deleteMany(createMockContext({ body: { subscriber_ids: ["subscriber-1", "subscriber-2"] } }));
            expect(subscriberService.deleteMany).toHaveBeenCalledWith(["subscriber-1", "subscriber-2"]);
            expect(result.body).toEqual({ deleted_ids: ["subscriber-1"], blocked_ids: ["subscriber-2"] });
        });
    });

    describe("removeManyFromGroup", () => {
        it("400s without a group_id", async () => {
            const ctx = createMockContext({ params: {}, body: { subscriber_ids: ["subscriber-1"] } });
            await expectHttpException(controller.removeManyFromGroup(ctx), 400, "groupId");
        });

        it("400s on malformed subscriber_ids", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1" }, body: { subscriber_ids: [] } });
            await expect(controller.removeManyFromGroup(ctx)).rejects.toThrow("subscriber_ids");
            expect(subscriberService.removeManyFromGroup).not.toHaveBeenCalled();
        });

        it("removes the subscribers from the group", async () => {
            const ctx = createMockContext({ params: { group_id: "group-1" }, body: { subscriber_ids: ["subscriber-1", "subscriber-9"] } });
            const result: any = await controller.removeManyFromGroup(ctx);
            expect(subscriberService.removeManyFromGroup).toHaveBeenCalledWith("group-1", ["subscriber-1", "subscriber-9"]);
            expect(result.body).toEqual({ removed_ids: ["subscriber-1"] });
        });
    });
});
