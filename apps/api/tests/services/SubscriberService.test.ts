import { describe, it, expect, mock, beforeEach } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";

/**
 * `SubscriberService`'s group-membership writes with the Drizzle `db` mocked:
 * memberships are written in the same transaction as the subscriber, and an
 * unknown group id is a `ValidationError` rather than a foreign-key failure.
 */
const mockDb = createMockDb();
mock.module("../../src/libs/db", () => ({ db: mockDb, connectDB: async () => {} }));

const { SubscriberService } = await import("../../src/services/SubscriberService");
const { ValidationError } = await import("../../src/libs");

describe("SubscriberService group memberships", () => {
    const service = new SubscriberService();
    const stored = { id: "subscriber-1", email_id: "a@b.co", group_ids: ["group-1", "group-2"] };

    beforeEach(() => {
        for (const method of ["select", "insert", "update", "delete"] as const) {
            mockDb[method].mockReset();
            mockDb[method].mockImplementation(() => chain([]));
        }
    });

    it("creates the subscriber and one membership per distinct group", async () => {
        mockDb.insert.mockImplementationOnce(() => chain([{ id: "subscriber-1" }])); // subscribers row
        mockDb.select
            .mockImplementationOnce(() => chain([{ id: "group-1" }, { id: "group-2" }])) // groups exist
            .mockImplementationOnce(() => chain([stored])); // read back with group_ids

        const result = await service.create({ email_id: "a@b.co", group_ids: ["group-1", "group-2", "group-1"] });

        expect(result).toEqual(stored as any);
        // subscribers insert + one group_subscriber insert carrying both groups.
        expect(mockDb.insert).toHaveBeenCalledTimes(2);
        const membershipInsert = mockDb.insert.mock.results[1]!.value;
        expect(membershipInsert.values).toHaveBeenCalledWith([
            { group_id: "group-1", subscriber_id: "subscriber-1" },
            { group_id: "group-2", subscriber_id: "subscriber-1" },
        ]);
    });

    it("rejects an unknown group id before writing any membership", async () => {
        mockDb.insert.mockImplementationOnce(() => chain([{ id: "subscriber-1" }]));
        mockDb.select.mockImplementationOnce(() => chain([{ id: "group-1" }])); // only group-1 exists

        await expect(service.create({ email_id: "a@b.co", group_ids: ["group-1", "nope"] })).rejects.toThrow(ValidationError);
        expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it("replaces memberships on update when group_ids is given, without touching other fields", async () => {
        mockDb.select
            .mockImplementationOnce(() => chain([{ id: "subscriber-1" }])) // exists (groups-only update)
            .mockImplementationOnce(() => chain([{ id: "group-2" }])) // group exists
            .mockImplementationOnce(() => chain([{ ...stored, group_ids: ["group-2"] }]));

        const result = await service.update("subscriber-1", { group_ids: ["group-2"] });

        expect(result?.group_ids).toEqual(["group-2"]);
        expect(mockDb.update).not.toHaveBeenCalled();
        expect(mockDb.delete).toHaveBeenCalledTimes(1); // old memberships cleared
    });

    it("returns null when removing someone who isn't in the group", async () => {
        mockDb.delete.mockImplementationOnce(() => chain([]));
        expect(await service.removeFromGroup("group-9", "subscriber-1")).toBeNull();
    });
});

describe("SubscriberService.importMany", () => {
    const service = new SubscriberService();

    beforeEach(() => {
        for (const method of ["select", "insert", "update", "delete"] as const) {
            mockDb[method].mockReset();
            mockDb[method].mockImplementation(() => chain([]));
        }
    });

    it("skips bad and repeated rows, reuses existing emails, creates the rest and links all to the groups", async () => {
        mockDb.select
            .mockImplementationOnce(() => chain([{ id: "group-1" }])) // group exists
            .mockImplementationOnce(() => chain([{ id: "existing-1", email: "old@b.co" }])); // OLD@b.co already a subscriber
        mockDb.insert
            .mockImplementationOnce(() => chain([{ id: "new-1" }])) // subscribers insert
            .mockImplementationOnce(() => chain([])); // memberships insert

        const result = await service.importMany([
            { email_id: " new@b.co ", first_name: " Ada ", last_name: "" },
            { email_id: "OLD@b.co", first_name: "Ignored" },
            { email_id: "" },
            { email_id: "not-an-email" },
            { email_id: "NEW@b.co" },
        ], ["group-1", "group-1"]);

        expect(result).toEqual({
            created: 1,
            existing: 1,
            group_ids: ["group-1"],
            skipped: [
                { row: 3, email_id: "", reason: "Missing email" },
                { row: 4, email_id: "not-an-email", reason: "Invalid email" },
                { row: 5, email_id: "NEW@b.co", reason: "Duplicate of an earlier row" },
            ],
        });
        // Only the new person is created, trimmed, with a blank last name left out.
        expect(mockDb.insert.mock.results[0]!.value.values).toHaveBeenCalledWith([{ email_id: "new@b.co", first_name: "Ada", last_name: undefined }]);
        // Existing and new subscribers both join the group, once.
        expect(mockDb.insert.mock.results[1]!.value.values).toHaveBeenCalledWith([
            { group_id: "group-1", subscriber_id: "existing-1" },
            { group_id: "group-1", subscriber_id: "new-1" },
        ]);
        expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("rejects an unknown group before writing anything", async () => {
        mockDb.select.mockImplementationOnce(() => chain([])); // no group found

        await expect(service.importMany([{ email_id: "a@b.co" }], ["nope"])).rejects.toThrow(ValidationError);
        expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("writes no memberships when no groups are given", async () => {
        mockDb.select.mockImplementationOnce(() => chain([])); // no existing subscribers
        mockDb.insert.mockImplementationOnce(() => chain([{ id: "new-1" }]));

        const result = await service.importMany([{ email_id: "a@b.co" }], []);

        expect(result.created).toBe(1);
        expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
});

describe("SubscriberService bulk delete and remove", () => {
    const service = new SubscriberService();

    beforeEach(() => {
        for (const method of ["select", "insert", "update", "delete"] as const) {
            mockDb[method].mockReset();
            mockDb[method].mockImplementation(() => chain([]));
        }
    });

    it("deletes only subscribers without send history and reports the rest as blocked", async () => {
        mockDb.select.mockImplementationOnce(() => chain([{ id: "sent-1" }, { id: "sent-1" }])); // one delivery per send
        mockDb.delete.mockImplementationOnce(() => chain([{ id: "fresh-1" }])); // missing-1 doesn't exist

        const result = await service.deleteMany(["fresh-1", "sent-1", "missing-1", "fresh-1"]);

        expect(result).toEqual({ deleted_ids: ["fresh-1"], blocked_ids: ["sent-1"] });
        expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it("skips the delete when every subscriber has send history", async () => {
        mockDb.select.mockImplementationOnce(() => chain([{ id: "sent-1" }]));

        const result = await service.deleteMany(["sent-1"]);

        expect(result).toEqual({ deleted_ids: [], blocked_ids: ["sent-1"] });
        expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("returns the subscribers actually removed from the group", async () => {
        mockDb.delete.mockImplementationOnce(() => chain([{ subscriber_id: "subscriber-1" }]));

        const result = await service.removeManyFromGroup("group-1", ["subscriber-1", "not-a-member"]);

        expect(result).toEqual({ removed_ids: ["subscriber-1"] });
    });
});
