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

    it("removes send history, deletes, then cancels the queued send, leaving the library alone", async () => {
        mockDb.select.mockImplementationOnce(() => chain([scheduled]));
        const result = await service.delete("campaign-1");

        expect(result).toEqual(scheduled as any);
        // Templates, groups and subscribers are a shared library: nothing of theirs is touched
        // (the campaign's link rows go with it through ON DELETE CASCADE).
        expect(mockDb.update).not.toHaveBeenCalled();
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
 * The From address rules `create`/`update` enforce. Each case queues the
 * selects in the order the service runs them: for `create`, the identity
 * lookup then the final read of the campaign with its links; for `update`,
 * the "before" row, any identity lookups, then that same final read. The
 * insert/update chain returns the row as written.
 */
describe("CampaignService sender validation", () => {
    const service = new CampaignService();
    const domainRow = { id: "campaign-1", name: "Launch", status: "draft", start_time: null, identity_id: "identity-domain", template_id: null, from_local_part: "notifications", from_name: null };
    const withLinks = (row: object) => ({ ...row, group_ids: [], subscriber_ids: [] });

    beforeEach(() => {
        mockDb.select.mockReset();
        mockDb.insert.mockReset();
        mockDb.update.mockReset();
        mockDb.delete.mockReset();
        mockDb.delete.mockImplementation(() => chain([]));
    });

    it("creates a domain-identity campaign with a valid local part", async () => {
        mockDb.insert.mockImplementationOnce(() => chain([domainRow]));
        mockDb.select
            .mockImplementationOnce(() => chain([{ type: "domain" }])) // identity type, for the sender check
            .mockImplementationOnce(() => chain([withLinks(domainRow)])); // final read with links

        expect(await service.create({ name: "Launch", identity_id: "identity-domain", from_local_part: " notifications " })).toEqual(withLinks(domainRow) as any);
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
        const row = { ...domainRow, identity_id: null, from_local_part: null };
        mockDb.insert.mockImplementationOnce(() => chain([row]));
        mockDb.select.mockImplementationOnce(() => chain([withLinks(row)])); // only the final read

        await service.create({ name: "Launch" });
        expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it("clears a leftover local part when an update switches to an email identity", async () => {
        const emailRow = { ...domainRow, identity_id: "identity-email", from_local_part: null };
        mockDb.select
            .mockImplementationOnce(() => chain([domainRow])) // the row before the update
            .mockImplementationOnce(() => chain([{ type: "email" }])) // new identity's type, for clearing
            .mockImplementationOnce(() => chain([{ type: "email" }])) // new identity's type, for the check
            .mockImplementationOnce(() => chain([withLinks(emailRow)])); // final read with links
        mockDb.update.mockImplementationOnce(() => chain([emailRow]));

        expect(await service.update("campaign-1", { identity_id: "identity-email" })).toEqual(withLinks(emailRow) as any);
        const set = (mockDb.update.mock.results[0]!.value as any).set;
        expect(set.mock.calls[0][0].from_local_part).toBeNull();
    });

    it("doesn't check the sender on a status-only update, so finishing a send never fails over it", async () => {
        const invalidRow = { ...domainRow, from_local_part: null, status: "sent" };
        mockDb.select
            .mockImplementationOnce(() => chain([{ ...invalidRow, status: "sending" }]))
            .mockImplementationOnce(() => chain([withLinks(invalidRow)]));
        mockDb.update.mockImplementationOnce(() => chain([invalidRow]));

        expect(await service.update("campaign-1", { status: "sent" })).toEqual(withLinks(invalidRow) as any);
        // The "before" read and the final read - no identity lookup.
        expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    it("rejects an update whose name contains a line break", async () => {
        mockDb.select
            .mockImplementationOnce(() => chain([domainRow]))
            .mockImplementationOnce(() => chain([{ type: "domain" }]));
        mockDb.update.mockImplementationOnce(() => chain([{ ...domainRow, from_name: "Mail\nRocket" }]));

        await expect(service.update("campaign-1", { from_name: "Mail\nRocket" })).rejects.toThrow("line breaks");
    });
});

/**
 * The template and audience a campaign picks: checked to exist, written to
 * the link tables, returned as `group_ids`/`subscriber_ids`, and frozen once
 * the send has started.
 */
describe("CampaignService template and audience", () => {
    const service = new CampaignService();
    const draft = { id: "campaign-1", name: "Launch", status: "draft", start_time: null, identity_id: null, template_id: "template-1", from_local_part: null, from_name: null };

    beforeEach(() => {
        mockDb.select.mockReset();
        mockDb.insert.mockReset();
        mockDb.update.mockReset();
        mockDb.delete.mockReset();
        mockDb.insert.mockImplementation(() => chain([]));
        mockDb.delete.mockImplementation(() => chain([]));
    });

    it("creates a campaign with its template, groups and subscribers in one go", async () => {
        const linked = { ...draft, group_ids: ["group-1"], subscriber_ids: ["subscriber-1"] };
        mockDb.insert.mockImplementationOnce(() => chain([draft])); // the campaign row
        mockDb.select
            .mockImplementationOnce(() => chain([{ id: "template-1" }])) // template exists
            .mockImplementationOnce(() => chain([{ id: "group-1" }])) // groups exist
            .mockImplementationOnce(() => chain([{ id: "subscriber-1" }])) // subscribers exist
            .mockImplementationOnce(() => chain([linked])); // final read with links

        const result = await service.create({ name: "Launch", template_id: "template-1", group_ids: ["group-1", "group-1"], subscriber_ids: ["subscriber-1"] });

        expect(result).toEqual(linked as any);
        // The campaign row never carries the link arrays.
        const campaignValues = (mockDb.insert.mock.results[0]!.value as any).values.mock.calls[0][0];
        expect(campaignValues.group_ids).toBeUndefined();
        expect(campaignValues.subscriber_ids).toBeUndefined();
        // One link row per distinct group, and per subscriber.
        const groupLinks = (mockDb.insert.mock.results[1]!.value as any).values.mock.calls[0][0];
        expect(groupLinks).toEqual([{ campaign_id: "campaign-1", group_id: "group-1" }]);
        const subscriberLinks = (mockDb.insert.mock.results[2]!.value as any).values.mock.calls[0][0];
        expect(subscriberLinks).toEqual([{ campaign_id: "campaign-1", subscriber_id: "subscriber-1" }]);
    });

    it("rejects an unknown template", async () => {
        mockDb.select.mockImplementationOnce(() => chain([]));

        await expect(service.create({ name: "Launch", template_id: "nope" })).rejects.toThrow("Unknown template id: nope");
        expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("rejects unknown group ids, naming them", async () => {
        mockDb.insert.mockImplementationOnce(() => chain([{ ...draft, template_id: null }]));
        mockDb.select.mockImplementationOnce(() => chain([{ id: "group-1" }]));

        await expect(service.create({ name: "Launch", group_ids: ["group-1", "ghost"] })).rejects.toThrow("Unknown group id(s): ghost");
    });

    it("replaces a draft's groups when group_ids is sent, leaving its subscribers alone", async () => {
        mockDb.select
            .mockImplementationOnce(() => chain([draft])) // before
            .mockImplementationOnce(() => chain([{ id: "group-2" }])) // groups exist
            .mockImplementationOnce(() => chain([{ ...draft, group_ids: ["group-2"], subscriber_ids: [] }])); // final read
        mockDb.update.mockImplementationOnce(() => chain([draft]));

        const result = await service.update("campaign-1", { group_ids: ["group-2"] });

        expect(result?.group_ids).toEqual(["group-2"]);
        // Only campaign_group links were rewritten.
        expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it("refuses to change the template or audience once the send has started", async () => {
        // One "before" read per update call.
        mockDb.select.mockImplementation(() => chain([{ ...draft, status: "sending" }]));

        await expect(service.update("campaign-1", { group_ids: [] })).rejects.toThrow("already started sending");
        await expect(service.update("campaign-1", { template_id: "template-2" })).rejects.toThrow(ValidationError);
        expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("refuses to leave a scheduled campaign without a template", async () => {
        const scheduledRow = { ...draft, status: "scheduled", start_time: new Date("2030-01-01") };
        mockDb.select.mockImplementationOnce(() => chain([scheduledRow]));
        mockDb.update.mockImplementationOnce(() => chain([{ ...scheduledRow, template_id: null }]));

        await expect(service.update("campaign-1", { template_id: null })).rejects.toThrow("needs a template");
    });
});
