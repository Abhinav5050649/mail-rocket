import { describe, it, expect, mock, beforeEach } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";

/**
 * `CampaignService.delete` with the Drizzle `db` and the BullMQ dispatch
 * helpers mocked, so no Postgres or Redis is needed.
 */
const mockDb = createMockDb();
const mockCancel = mock(async (_campaignId: string) => {});
mock.module("../../src/libs/db", () => ({ db: mockDb, connectDB: async () => {} }));
mock.module("../../src/queues/CampaignDispatch", () => ({ scheduleCampaignDispatch: mock(async () => {}), cancelCampaignDispatch: mockCancel }));

const { CampaignService } = await import("../../src/services/CampaignService");
const { ValidationError } = await import("../../src/libs");

describe("CampaignService.delete", () => {
    const service = new CampaignService();
    const scheduled = { id: "campaign-1", name: "Launch", status: "scheduled" };

    beforeEach(() => {
        mockDb.select.mockReset();
        mockDb.update.mockReset();
        mockDb.delete.mockReset();
        mockDb.update.mockImplementation(() => chain([]));
        mockDb.delete.mockImplementation(() => chain([scheduled]));
        mockCancel.mockReset();
    });

    it("returns null for an unknown campaign without touching the queue", async () => {
        mockDb.select.mockImplementationOnce(() => chain([]));
        expect(await service.delete("missing")).toBeNull();
        expect(mockDb.delete).not.toHaveBeenCalled();
        expect(mockCancel).not.toHaveBeenCalled();
    });

    it("unlinks templates, groups and subscribers, removes send history, deletes, then cancels the queued send", async () => {
        mockDb.select.mockImplementationOnce(() => chain([scheduled]));
        const result = await service.delete("campaign-1");

        expect(result).toEqual(scheduled as any);
        // template, group, subscribers each get campaign_id cleared.
        expect(mockDb.update).toHaveBeenCalledTimes(3);
        // campaign_delivery history, then the campaign row itself.
        expect(mockDb.delete).toHaveBeenCalledTimes(2);
        expect(mockCancel).toHaveBeenCalledWith("campaign-1");
    });

    it("still succeeds when cancelling the dispatch job fails", async () => {
        mockDb.select.mockImplementationOnce(() => chain([scheduled]));
        mockCancel.mockImplementationOnce(async () => {
            throw new Error("redis down");
        });
        expect(await service.delete("campaign-1")).toEqual(scheduled as any);
    });

    it("refuses to delete a campaign that is sending", async () => {
        mockDb.select.mockImplementationOnce(() => chain([{ ...scheduled, status: "sending" }]));
        await expect(service.delete("campaign-1")).rejects.toThrow(ValidationError);
        expect(mockDb.delete).not.toHaveBeenCalled();
        expect(mockCancel).not.toHaveBeenCalled();
    });
});

/**
 * The From address rules `create`/`update` enforce. The first select in each
 * case is the identity lookup (create) or the "before" row (update); the
 * insert/update chain returns the row as written.
 */
describe("CampaignService sender validation", () => {
    const service = new CampaignService();
    const domainRow = { id: "campaign-1", name: "Launch", status: "draft", start_time: null, identity_id: "identity-domain", from_local_part: "notifications", from_name: null };

    beforeEach(() => {
        mockDb.select.mockReset();
        mockDb.insert.mockReset();
        mockDb.update.mockReset();
    });

    it("creates a domain-identity campaign with a valid local part", async () => {
        mockDb.insert.mockImplementationOnce(() => chain([domainRow]));
        mockDb.select.mockImplementationOnce(() => chain([{ type: "domain" }]));

        expect(await service.create({ name: "Launch", identity_id: "identity-domain", from_local_part: " notifications " })).toEqual(domainRow as any);
        // The local part reaches the insert trimmed.
        const values = (mockDb.insert.mock.results[0]!.value as any).values;
        expect(values.mock.calls[0][0].from_local_part).toBe("notifications");
    });

    it("rejects a domain-identity campaign without a local part", async () => {
        mockDb.insert.mockImplementationOnce(() => chain([{ ...domainRow, from_local_part: null }]));
        mockDb.select.mockImplementationOnce(() => chain([{ type: "domain" }]));

        await expect(service.create({ name: "Launch", identity_id: "identity-domain", from_local_part: "" })).rejects.toThrow("needs a From address");
    });

    it("rejects an email-identity campaign that sets a local part", async () => {
        mockDb.insert.mockImplementationOnce(() => chain([{ ...domainRow, identity_id: "identity-email" }]));
        mockDb.select.mockImplementationOnce(() => chain([{ type: "email" }]));

        await expect(service.create({ name: "Launch", identity_id: "identity-email", from_local_part: "notifications" })).rejects.toThrow(ValidationError);
    });

    it("skips the check for a campaign with no identity yet", async () => {
        mockDb.insert.mockImplementationOnce(() => chain([{ ...domainRow, identity_id: null, from_local_part: null }]));

        await service.create({ name: "Launch" });
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("clears a leftover local part when an update switches to an email identity", async () => {
        const emailRow = { ...domainRow, identity_id: "identity-email", from_local_part: null };
        mockDb.select
            .mockImplementationOnce(() => chain([domainRow])) // the row before the update
            .mockImplementationOnce(() => chain([{ type: "email" }])) // new identity's type, for clearing
            .mockImplementationOnce(() => chain([{ type: "email" }])); // new identity's type, for the check
        mockDb.update.mockImplementationOnce(() => chain([emailRow]));

        expect(await service.update("campaign-1", { identity_id: "identity-email" })).toEqual(emailRow as any);
        const set = (mockDb.update.mock.results[0]!.value as any).set;
        expect(set.mock.calls[0][0].from_local_part).toBeNull();
    });

    it("doesn't check the sender on a status-only update, so finishing a send never fails over it", async () => {
        const invalidRow = { ...domainRow, from_local_part: null, status: "sent" };
        mockDb.select.mockImplementationOnce(() => chain([{ ...invalidRow, status: "sending" }]));
        mockDb.update.mockImplementationOnce(() => chain([invalidRow]));

        expect(await service.update("campaign-1", { status: "sent" })).toEqual(invalidRow as any);
        // Only the "before" read ran - no identity lookup.
        expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it("rejects an update whose name contains a line break", async () => {
        mockDb.select
            .mockImplementationOnce(() => chain([domainRow]))
            .mockImplementationOnce(() => chain([{ type: "domain" }]));
        mockDb.update.mockImplementationOnce(() => chain([{ ...domainRow, from_name: "Mail\nRocket" }]));

        await expect(service.update("campaign-1", { from_name: "Mail\nRocket" })).rejects.toThrow("line breaks");
    });
});
