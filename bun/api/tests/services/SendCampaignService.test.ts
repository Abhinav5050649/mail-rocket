import { describe, it, expect, mock, beforeEach } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";

/**
 * Unit tests for the campaign-send pipeline (`SendCampaignService`), which
 * is what actually calls out to AWS SES to deliver campaign emails. `db`
 * and `sesClient` are both replaced with in-memory mocks via `mock.module`
 * below, so nothing here touches a real Postgres instance or makes a real
 * AWS call.
 *
 * NOTE: per project instructions, these tests are defined but intentionally
 * NOT run in this environment - no AWS credentials are configured here.
 * They're written to be runnable as-is once credentials/DB access exist
 * (`bun run test:send-flows`), since every AWS/DB touchpoint is mocked.
 */

const mockDb = createMockDb();
const mockSesSend = mock(async () => ({ MessageId: "mock-message-id" }));

mock.module("../../src/libs/db", () => ({ db: mockDb }));
mock.module("../../src/libs/ses", () => ({ sesClient: { send: mockSesSend } }));

const { SendCampaignService } = await import("../../src/services/SendCampaignService");

const campaign = {
    id: "campaign-1",
    organization_id: "org-1",
    identity_id: "identity-1",
    subject: "Big Announcement",
    status: "sending",
};

const emailIdentity = { id: "identity-1", type: "email", identity: "sender@example.com", status: "active" };
const domainIdentity = { id: "identity-2", type: "domain", identity: "example.com", status: "active" };
const template = {
    id: "template-1",
    entity: "mail_rocket.template",
    name: "Announcement",
    html_body: "<p>Hello!</p>",
    campaign_id: "campaign-1",
    organization_id: "org-1",
    normalized_name: null,
    created_at: new Date("2026-01-01"),
    updated_at: null,
    description: null,
};

describe("SendCampaignService", () => {
    let service: InstanceType<typeof SendCampaignService>;

    beforeEach(() => {
        service = new SendCampaignService();
        mockSesSend.mockClear();
        mockDb.select.mockClear();
        mockDb.update.mockClear();
        mockDb.insert.mockClear();
    });

    describe("getRecipientIdsForCampaign", () => {
        it("returns the ids of every recipient row for the campaign", async () => {
            mockDb.select.mockImplementationOnce(() => chain([{ id: "recipient-1" }, { id: "recipient-2" }]));

            const ids = await service.getRecipientIdsForCampaign("campaign-1");

            expect(ids).toEqual(["recipient-1", "recipient-2"]);
        });

        it("returns an empty array when the campaign has no recipients", async () => {
            mockDb.select.mockImplementationOnce(() => chain([]));

            const ids = await service.getRecipientIdsForCampaign("campaign-1");

            expect(ids).toEqual([]);
        });
    });

    describe("getCurrentTemplateForCampaign", () => {
        it("returns the most-recently-updated template", async () => {
            mockDb.select.mockImplementationOnce(() => chain([template]));

            const result = await service.getCurrentTemplateForCampaign("campaign-1");

            expect(result).toEqual(template);
        });

        it("returns null when the campaign has no template", async () => {
            mockDb.select.mockImplementationOnce(() => chain([]));

            const result = await service.getCurrentTemplateForCampaign("campaign-1");

            expect(result).toBeNull();
        });
    });

    describe("createCampaignRecipientManifest", () => {
        it("creates one campaign_recipient row per recipient and returns their ids", async () => {
            mockDb.insert.mockImplementationOnce(() => chain([{ id: "cr-1" }, { id: "cr-2" }]));

            const ids = await service.createCampaignRecipientManifest("campaign-1", "org-1", ["recipient-1", "recipient-2"]);

            expect(ids).toEqual(["cr-1", "cr-2"]);
        });
    });

    describe("sendChunk", () => {
        it("sends to every pending recipient via SES and marks each as sent", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign])) // CampaignService.getById
                .mockImplementationOnce(() => chain([emailIdentity])) // IdentityService.getById
                .mockImplementationOnce(() => chain([template])) // getCurrentTemplateForCampaign
                .mockImplementationOnce(() => chain([ // campaign_recipient join rows
                    { campaignRecipientId: "cr-1", sendStatus: "pending", email: "one@example.com" },
                    { campaignRecipientId: "cr-2", sendStatus: "pending", email: "two@example.com" },
                ]));

            await service.sendChunk("campaign-1", ["cr-1", "cr-2"]);

            expect(mockSesSend).toHaveBeenCalledTimes(2);
            expect(mockDb.update).toHaveBeenCalledTimes(2);
        });

        it("skips recipients already marked sent (safe to retry)", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([template]))
                .mockImplementationOnce(() => chain([
                    { campaignRecipientId: "cr-1", sendStatus: "sent", email: "one@example.com" },
                ]));

            await service.sendChunk("campaign-1", ["cr-1"]);

            expect(mockSesSend).not.toHaveBeenCalled();
            expect(mockDb.update).not.toHaveBeenCalled();
        });

        it("marks a recipient with no email as failed without calling SES", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([template]))
                .mockImplementationOnce(() => chain([
                    { campaignRecipientId: "cr-1", sendStatus: "pending", email: null },
                ]));

            await service.sendChunk("campaign-1", ["cr-1"]);

            expect(mockSesSend).not.toHaveBeenCalled();
            expect(mockDb.update).toHaveBeenCalledTimes(1);
        });

        it("catches a per-recipient SES failure, marks it failed, and keeps sending the rest of the chunk", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([template]))
                .mockImplementationOnce(() => chain([
                    { campaignRecipientId: "cr-1", sendStatus: "pending", email: "bounces@example.com" },
                    { campaignRecipientId: "cr-2", sendStatus: "pending", email: "two@example.com" },
                ]));
            mockSesSend
                .mockImplementationOnce(async () => { throw new Error("SES rejected the recipient"); })
                .mockImplementationOnce(async () => ({ MessageId: "ok" }));

            await service.sendChunk("campaign-1", ["cr-1", "cr-2"]);

            expect(mockSesSend).toHaveBeenCalledTimes(2);
            expect(mockDb.update).toHaveBeenCalledTimes(2);
        });

        it("throws when the campaign can't be found", async () => {
            mockDb.select.mockImplementationOnce(() => chain([]));

            await expect(service.sendChunk("missing-campaign", ["cr-1"])).rejects.toThrow("not found");
        });

        it("throws when the campaign has no identity_id", async () => {
            mockDb.select.mockImplementationOnce(() => chain([{ ...campaign, identity_id: null }]));

            await expect(service.sendChunk("campaign-1", ["cr-1"])).rejects.toThrow("no identity_id");
        });

        it("throws when the sending identity is a domain (not yet supported as a From address)", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([domainIdentity]));

            await expect(service.sendChunk("campaign-1", ["cr-1"])).rejects.toThrow("only 'email' sending identities are supported");
        });

        it("throws when the campaign has no template", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([]));

            await expect(service.sendChunk("campaign-1", ["cr-1"])).rejects.toThrow("has no template");
        });
    });

    describe("finalizeCampaign", () => {
        // finalizeCampaign issues two selects: the recipient send_status
        // counts, then (via CampaignService.update's transaction) a
        // "before" read of the campaign row that gates its own
        // scheduling logic - queue results for both, in that order.
        it("marks the campaign sent when at least one recipient succeeded", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([{ status: "sent", count: 3 }, { status: "failed", count: 1 }]))
                .mockImplementationOnce(() => chain([campaign]));

            await service.finalizeCampaign("campaign-1");

            expect(mockDb.update).toHaveBeenCalledTimes(1);
        });

        it("marks the campaign send_failed when nobody was successfully sent to", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([{ status: "failed", count: 2 }]))
                .mockImplementationOnce(() => chain([campaign]));

            await service.finalizeCampaign("campaign-1");

            expect(mockDb.update).toHaveBeenCalledTimes(1);
        });
    });
});
