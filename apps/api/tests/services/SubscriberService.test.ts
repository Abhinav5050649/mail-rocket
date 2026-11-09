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
