import { describe, it, expect, beforeEach } from "bun:test";
import { mock } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";

/**
 * Templates and groups are shared libraries, so deleting one could pull the
 * content or audience out from under a campaign that's about to send.
 * `GroupService.delete` and `TemplateService.delete` refuse while a
 * scheduled or sending campaign uses them, and delete otherwise.
 */
const mockDb = createMockDb();
mock.module("../../src/libs/db", () => ({ db: mockDb, connectDB: async () => {} }));

const { GroupService } = await import("../../src/services/GroupService");
const { TemplateService } = await import("../../src/services/TemplateService");
const { ValidationError } = await import("../../src/libs");

describe("library delete guards", () => {
    beforeEach(() => {
        mockDb.select.mockReset();
        mockDb.delete.mockReset();
    });

    it("refuses to delete a group a scheduled or sending campaign sends to, naming the campaign", async () => {
        mockDb.select.mockImplementationOnce(() => chain([{ name: "Holiday greetings" }]));

        await expect(new GroupService().delete("group-1")).rejects.toThrow(`"Holiday greetings" is scheduled or sending to this group`);
        expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("deletes a group no active campaign uses", async () => {
        mockDb.select.mockImplementationOnce(() => chain([]));
        mockDb.delete.mockImplementationOnce(() => chain([{ id: "group-1", name: "VIP" }]));

        expect(await new GroupService().delete("group-1")).toEqual({ id: "group-1", name: "VIP" } as any);
    });

    it("refuses to delete a template a scheduled or sending campaign uses", async () => {
        mockDb.select.mockImplementationOnce(() => chain([{ name: "Holiday greetings" }]));

        await expect(new TemplateService().delete("template-1")).rejects.toThrow(ValidationError);
        expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("deletes a template no active campaign uses, returning null when it doesn't exist", async () => {
        mockDb.select.mockImplementationOnce(() => chain([]));
        mockDb.delete.mockImplementationOnce(() => chain([]));

        expect(await new TemplateService().delete("missing")).toBeNull();
    });
});
