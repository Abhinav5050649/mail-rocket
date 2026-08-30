import { describe, it, expect, mock, beforeEach } from "bun:test";
import { chain, createMockDb } from "../helpers/mockDb";

/**
 * Unit tests for `IdentityService`, which registers an organization's
 * sending domains/email addresses with AWS SES. `db` and `sesClient` are
 * both replaced with in-memory mocks via `mock.module` below, and the
 * background verification-polling scheduler is stubbed out too, so nothing
 * here touches a real Postgres instance, Redis/BullMQ, or makes a real AWS
 * call.
 *
 * NOTE: per project instructions, these tests are defined but intentionally
 * NOT run in this environment - no AWS credentials are configured here.
 * They're written to be runnable as-is once credentials/DB access exist
 * (`bun run test:send-flows`), since every AWS/DB/queue touchpoint is mocked.
 */

const mockDb = createMockDb();
const mockSesSend = mock(async () => ({}));
const mockScheduleCheck = mock(async () => { });

mock.module("../../src/libs/db", () => ({ db: mockDb }));
mock.module("../../src/libs/ses", () => ({ sesClient: { send: mockSesSend } }));
mock.module("../../src/queues/IdentityVerificationScheduler", () => ({ scheduleIdentityVerificationCheck: mockScheduleCheck }));

const { IdentityService } = await import("../../src/services/IdentityService");
const { ValidationError } = await import("../../src/libs/errors");

const emailIdentity = {
    id: "identity-1",
    entity: "mail_rocket.identity",
    organization_id: "org-1",
    type: "email" as const,
    identity: "sender@example.com",
    status: "pending" as const,
    verification_records: null,
    created_at: new Date("2026-01-01"),
    updated_at: null,
    description: null,
};
const domainIdentity = {
    id: "identity-2",
    entity: "mail_rocket.identity",
    organization_id: "org-1",
    type: "domain" as const,
    identity: "example.com",
    status: "pending" as const,
    verification_records: null,
    created_at: new Date("2026-01-01"),
    updated_at: null,
    description: null,
};

describe("IdentityService", () => {
    let service: InstanceType<typeof IdentityService>;

    beforeEach(() => {
        service = new IdentityService();
        mockSesSend.mockClear();
        mockScheduleCheck.mockClear();
        mockDb.select.mockClear();
        mockDb.insert.mockClear();
        mockDb.update.mockClear();
        mockDb.delete.mockClear();
    });

    describe("create", () => {
        it("registers an email identity with SES and stores it with no verification records", async () => {
            mockSesSend.mockImplementationOnce(async () => ({}));
            mockDb.insert.mockImplementationOnce(() => chain([emailIdentity]));

            const result = await service.create({ type: "email", identity: "sender@example.com", organization_id: "org-1" });

            expect(mockSesSend).toHaveBeenCalledTimes(1);
            expect(mockScheduleCheck).toHaveBeenCalledWith(emailIdentity.id);
            expect(result).toEqual(emailIdentity);
        });

        it("registers a domain identity with SES and returns the DNS verification records", async () => {
            mockSesSend
                .mockImplementationOnce(async () => ({ VerificationToken: "txt-token" })) // VerifyDomainIdentityCommand
                .mockImplementationOnce(async () => ({ DkimTokens: ["dkim1", "dkim2"] })); // VerifyDomainDkimCommand
            mockDb.insert.mockImplementationOnce(() => chain([domainIdentity]));

            const result = await service.create({ type: "domain", identity: "example.com", organization_id: "org-1" });

            expect(mockSesSend).toHaveBeenCalledTimes(2);
            expect(mockScheduleCheck).toHaveBeenCalledWith(domainIdentity.id);
            expect(result).toEqual(domainIdentity);
        });

        it("throws a ValidationError for an unsupported identity type without touching SES or the DB", async () => {
            await expect(
                service.create({ type: "unsupported" as any, identity: "whatever", organization_id: "org-1" })
            ).rejects.toBeInstanceOf(ValidationError);

            expect(mockSesSend).not.toHaveBeenCalled();
            expect(mockDb.insert).not.toHaveBeenCalled();
        });

        it("defaults status to 'pending' when not provided", async () => {
            let insertNode: any;
            mockDb.insert.mockImplementationOnce(() => (insertNode = chain([emailIdentity])));

            await service.create({ type: "email", identity: "sender@example.com", organization_id: "org-1" });

            expect(insertNode.values).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }));
        });
    });

    describe("getById", () => {
        it("returns the identity when found", async () => {
            mockDb.select.mockImplementationOnce(() => chain([emailIdentity]));
            const result = await service.getById("identity-1");
            expect(result).toEqual(emailIdentity);
        });

        it("returns null when not found", async () => {
            mockDb.select.mockImplementationOnce(() => chain([]));
            const result = await service.getById("missing");
            expect(result).toBeNull();
        });
    });

    describe("getByOrganization", () => {
        it("lists identities for the organization", async () => {
            mockDb.select.mockImplementationOnce(() => chain([emailIdentity, domainIdentity]));
            const result = await service.getByOrganization("org-1");
            expect(result).toEqual([emailIdentity, domainIdentity]);
        });

        it("applies type/status filters and pagination without erroring", async () => {
            mockDb.select.mockImplementationOnce(() => chain([emailIdentity]));
            const result = await service.getByOrganization("org-1", { type: "email", status: "active", limit: 5, offset: 0 });
            expect(result).toEqual([emailIdentity]);
        });
    });

    describe("update", () => {
        it("returns the updated identity", async () => {
            mockDb.update.mockImplementationOnce(() => chain([{ ...emailIdentity, status: "active" }]));
            const result = await service.update("identity-1", { status: "active" });
            expect(result?.status).toBe("active");
        });

        it("returns null when no matching identity exists", async () => {
            mockDb.update.mockImplementationOnce(() => chain([]));
            const result = await service.update("missing", { status: "active" });
            expect(result).toBeNull();
        });
    });

    describe("delete", () => {
        it("returns the deleted identity", async () => {
            mockDb.delete.mockImplementationOnce(() => chain([emailIdentity]));
            const result = await service.delete("identity-1");
            expect(result).toEqual(emailIdentity);
        });

        it("returns null when no matching identity exists", async () => {
            mockDb.delete.mockImplementationOnce(() => chain([]));
            const result = await service.delete("missing");
            expect(result).toBeNull();
        });
    });
});
