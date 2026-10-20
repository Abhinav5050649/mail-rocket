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

    it("unlinks templates, groups and recipients, removes send history, deletes, then cancels the queued send", async () => {
        mockDb.select.mockImplementationOnce(() => chain([scheduled]));
        const result = await service.delete("campaign-1");

        expect(result).toEqual(scheduled as any);
        // template, group, recipients each get campaign_id cleared.
        expect(mockDb.update).toHaveBeenCalledTimes(3);
        // campaign_recipient history, then the campaign row itself.
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
