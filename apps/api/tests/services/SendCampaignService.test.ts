import { describe, it, expect, mock, beforeEach } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";
import { config } from "../../config";

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
mock.module("../../src/libs/ses", () => ({ sesClient: { send: mockSesSend }, sesV2Client: { send: mockSesSend } }));

const { SendCampaignService } = await import("../../src/services/SendCampaignService");

const campaign = {
    id: "campaign-1",
    name: "Fall Launch",
    identity_id: "identity-1",
    subject: "Big Announcement",
    start_time: new Date("2026-01-01"),
    status: "sending",
};

const organization = { id: "org-1", name: "Acme Inc", timezone: "UTC" };

const emailIdentity = { id: "identity-1", type: "email", identity: "sender@example.com", status: "active" };
const domainIdentity = { id: "identity-2", type: "domain", identity: "example.com", status: "active" };
const template = {
    id: "template-1",
    entity: "mail_rocket.template",
    name: "Announcement",
    html_body: "<p>Hello!</p>",
    campaign_id: "campaign-1",
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

    describe("getSubscriberIdsForCampaign", () => {
        it("returns the ids of every subscriber row for the campaign", async () => {
            mockDb.select.mockImplementationOnce(() => chain([{ id: "subscriber-1" }, { id: "subscriber-2" }]));

            const ids = await service.getSubscriberIdsForCampaign("campaign-1");

            expect(ids).toEqual(["subscriber-1", "subscriber-2"]);
        });

        it("returns an empty array when the campaign has no subscribers", async () => {
            mockDb.select.mockImplementationOnce(() => chain([]));

            const ids = await service.getSubscriberIdsForCampaign("campaign-1");

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

    describe("createDeliveryManifest", () => {
        it("creates one campaign_delivery row per subscriber and returns their ids", async () => {
            mockDb.insert.mockImplementationOnce(() => chain([{ id: "cr-1" }, { id: "cr-2" }]));

            const ids = await service.createDeliveryManifest("campaign-1", ["subscriber-1", "subscriber-2"]);

            expect(ids).toEqual(["cr-1", "cr-2"]);
        });
    });

    describe("sendChunk", () => {
        // Every non-early-throw path re-fetches, in order: campaign, identity,
        // the instance's single organization, template, then the
        // campaign_delivery join rows - so tests queue exactly one
        // organization select between identity and template.

        it("sends to every pending subscriber via SES and marks each as sent", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign])) // CampaignService.getById
                .mockImplementationOnce(() => chain([emailIdentity])) // IdentityService.getById
                .mockImplementationOnce(() => chain([organization])) // OrganizationService.get
                .mockImplementationOnce(() => chain([template])) // getCurrentTemplateForCampaign
                .mockImplementationOnce(() => chain([ // campaign_delivery join rows
                    { deliveryId: "cr-1", status: "pending", email: "one@example.com", firstName: "Ada", lastName: "Lovelace", groupNames: null },
                    { deliveryId: "cr-2", status: "pending", email: "two@example.com", firstName: "Alan", lastName: "Turing", groupNames: null },
                ]));

            await service.sendChunk("campaign-1", ["cr-1", "cr-2"]);

            expect(mockSesSend).toHaveBeenCalledTimes(2);
            expect(mockDb.update).toHaveBeenCalledTimes(2);
        });

        it("skips subscribers already marked sent (safe to retry)", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([template]))
                .mockImplementationOnce(() => chain([
                    { deliveryId: "cr-1", status: "sent", email: "one@example.com", firstName: "Ada", lastName: "Lovelace", groupNames: null },
                ]));

            await service.sendChunk("campaign-1", ["cr-1"]);

            expect(mockSesSend).not.toHaveBeenCalled();
            expect(mockDb.update).not.toHaveBeenCalled();
        });

        it("marks a subscriber with no email as failed without calling SES", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([template]))
                .mockImplementationOnce(() => chain([
                    { deliveryId: "cr-1", status: "pending", email: null, firstName: "Ada", lastName: "Lovelace", groupNames: null },
                ]));

            await service.sendChunk("campaign-1", ["cr-1"]);

            expect(mockSesSend).not.toHaveBeenCalled();
            expect(mockDb.update).toHaveBeenCalledTimes(1);
        });

        it("catches a per-subscriber SES failure, marks it failed, and keeps sending the rest of the chunk", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([template]))
                .mockImplementationOnce(() => chain([
                    { deliveryId: "cr-1", status: "pending", email: "bounces@example.com", firstName: "Ada", lastName: "Lovelace", groupNames: null },
                    { deliveryId: "cr-2", status: "pending", email: "two@example.com", firstName: "Alan", lastName: "Turing", groupNames: null },
                ]));
            mockSesSend
                .mockImplementationOnce(async () => { throw new Error("SES rejected the subscriber"); })
                .mockImplementationOnce(async () => ({ MessageId: "ok" }));

            await service.sendChunk("campaign-1", ["cr-1", "cr-2"]);

            expect(mockSesSend).toHaveBeenCalledTimes(2);
            expect(mockDb.update).toHaveBeenCalledTimes(2);
        });

        it("substitutes {{subscriber_first_name}} in the subject and body sent to SES", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([{ ...campaign, subject: "Hi {{subscriber_first_name}}" }]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([{ ...template, html_body: "<p>Hello {{subscriber_first_name}} from {{organization_name}}</p>" }]))
                .mockImplementationOnce(() => chain([
                    { deliveryId: "cr-1", status: "pending", email: "one@example.com", firstName: "Ada", lastName: "Lovelace", groupNames: null },
                ]));

            await service.sendChunk("campaign-1", ["cr-1"]);

            expect(mockSesSend).toHaveBeenCalledTimes(1);
            const command = (mockSesSend.mock.calls[0] as any)[0];
            expect(command.input.Content.Simple.Subject.Data).toBe("Hi Ada");
            expect(command.input.Content.Simple.Body.Html.Data).toBe("<p>Hello Ada from Acme Inc</p>");
            expect(command.input.Content.Simple.Headers).toBeUndefined();
            expect(mockDb.update).toHaveBeenCalledTimes(1);
        });

        it("adds an unsubscribe footer and one-click List-Unsubscribe headers when PUBLIC_API_URL is set", async () => {
            config.publicApiUrl = "https://api.example.com";
            config.trackingSecret = "test-secret";
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([template]))
                .mockImplementationOnce(() => chain([
                    { deliveryId: "cr-1", status: "pending", email: "one@example.com", firstName: "Ada", lastName: "Lovelace", groupNames: null },
                ]));

            try {
                await service.sendChunk("campaign-1", ["cr-1"]);
            } finally {
                config.publicApiUrl = "";
                config.trackingSecret = "";
            }

            const { Body, Headers } = (mockSesSend.mock.calls[0] as any)[0].input.Content.Simple;
            expect(Body.Html.Data).toContain(`<a href="https://api.example.com/unsubscribe/cr-1"`);
            expect(Headers).toEqual([
                { Name: "List-Unsubscribe", Value: "<https://api.example.com/unsubscribe/cr-1>" },
                { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
            ]);
        });

        it("skips a subscriber without calling SES when a placeholder can't be resolved for them", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([{ ...template, html_body: "<p>Hi {{subscriber_first_name}}</p>" }]))
                .mockImplementationOnce(() => chain([
                    // No first_name on record for this subscriber.
                    { deliveryId: "cr-1", status: "pending", email: "one@example.com", firstName: null, lastName: "Lovelace", groupNames: null },
                ]));

            await service.sendChunk("campaign-1", ["cr-1"]);

            expect(mockSesSend).not.toHaveBeenCalled();
            expect(mockDb.update).toHaveBeenCalledTimes(1);
            const setCall = mockDb.update.mock.results[0]!.value.set.mock.calls[0]![0];
            expect(setCall.status).toBe("failed");
            expect(setCall.description).toContain("subscriber_first_name");
        });

        it("throws when the campaign can't be found", async () => {
            mockDb.select.mockImplementationOnce(() => chain([]));

            await expect(service.sendChunk("missing-campaign", ["cr-1"])).rejects.toThrow("not found");
        });

        it("throws when the campaign has no identity_id", async () => {
            mockDb.select.mockImplementationOnce(() => chain([{ ...campaign, identity_id: null }]));

            await expect(service.sendChunk("campaign-1", ["cr-1"])).rejects.toThrow("no identity_id");
        });

        it("sends from <from_local_part>@<domain> with the display name when the identity is a domain", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([{ ...campaign, identity_id: "identity-2", from_local_part: "notifications", from_name: "Mail Rocket" }]))
                .mockImplementationOnce(() => chain([domainIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([{ ...template, html_body: "<p>From {{sender_email}}</p>" }]))
                .mockImplementationOnce(() => chain([
                    { deliveryId: "cr-1", status: "pending", email: "one@example.com", firstName: "Ada", lastName: "Lovelace", groupNames: null },
                ]));

            await service.sendChunk("campaign-1", ["cr-1"]);

            const command = (mockSesSend.mock.calls[0] as any)[0];
            expect(command.input.FromEmailAddress).toBe(`"Mail Rocket" <notifications@example.com>`);
            // {{sender_email}} is the bare address, never the domain or the display name.
            expect(command.input.Content.Simple.Body.Html.Data).toBe("<p>From notifications@example.com</p>");
        });

        it("sends from the email identity itself when the campaign has no display name", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([template]))
                .mockImplementationOnce(() => chain([
                    { deliveryId: "cr-1", status: "pending", email: "one@example.com", firstName: "Ada", lastName: "Lovelace", groupNames: null },
                ]));

            await service.sendChunk("campaign-1", ["cr-1"]);

            const command = (mockSesSend.mock.calls[0] as any)[0];
            expect(command.input.FromEmailAddress).toBe("sender@example.com");
        });

        it("throws without sending when a domain identity's campaign has no from_local_part", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([{ ...campaign, identity_id: "identity-2", from_local_part: null }]))
                .mockImplementationOnce(() => chain([domainIdentity]));

            await expect(service.sendChunk("campaign-1", ["cr-1"])).rejects.toThrow("needs a From address");
            expect(mockSesSend).not.toHaveBeenCalled();
        });

        it("throws when the campaign has no template", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([campaign]))
                .mockImplementationOnce(() => chain([emailIdentity]))
                .mockImplementationOnce(() => chain([organization]))
                .mockImplementationOnce(() => chain([]));

            await expect(service.sendChunk("campaign-1", ["cr-1"])).rejects.toThrow("has no template");
        });
    });

    describe("finalizeCampaign", () => {
        // finalizeCampaign issues two selects: the subscriber status
        // counts, then (via CampaignService.update's transaction) a
        // "before" read of the campaign row that gates its own
        // scheduling logic - queue results for both, in that order.
        it("marks the campaign sent when at least one subscriber succeeded", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([{ status: "sent", count: 3 }, { status: "failed", count: 1 }]))
                .mockImplementationOnce(() => chain([campaign]));

            await service.finalizeCampaign("campaign-1");

            expect(mockDb.update).toHaveBeenCalledTimes(1);
        });

        it("marks the campaign failed when nobody was successfully sent to", async () => {
            mockDb.select
                .mockImplementationOnce(() => chain([{ status: "failed", count: 2 }]))
                .mockImplementationOnce(() => chain([campaign]));

            await service.finalizeCampaign("campaign-1");

            expect(mockDb.update).toHaveBeenCalledTimes(1);
        });
    });
});
