import { describe, it, expect, mock, beforeEach } from "bun:test";
import { UserController } from "../../src/controllers";
import type { UserService } from "../../src/services";
import type { OrganizationUserService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("UserController", () => {
    let userService: UserService;
    let organizationUserService: OrganizationUserService;
    let controller: UserController;

    const user = {
        id: "user-1",
        entity: "mail_rocket.user",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        password_hash: "bcrypt-hash",
        created_at: new Date("2026-01-01"),
        updated_at: null,
        description: null,
        normalized_name: null,
    };

    beforeEach(() => {
        userService = {
            create: mock(async () => user),
            getById: mock(async () => user),
            update: mock(async () => user),
            delete: mock(async () => user),
        } as unknown as UserService;

        organizationUserService = {
            getOrganizationsByUser: mock(async () => []),
        } as unknown as OrganizationUserService;

        controller = new UserController(userService, organizationUserService);
    });

    describe("post", () => {
        it("creates a user and strips password_hash from the response", async () => {
            const ctx = createMockContext({ body: { email: "ada@example.com" } });

            const result: any = await controller.post(ctx);

            expect(userService.create).toHaveBeenCalledWith({ email: "ada@example.com" });
            expect(result.status).toBe(201);
            expect(result.body).not.toHaveProperty("password_hash");
            expect(result.body.email).toBe("ada@example.com");
        });
    });

    describe("get", () => {
        it("400s when the id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.get(ctx), 400, "userId");
        });

        it("404s when the user doesn't exist", async () => {
            (userService.getById as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { id: "missing" } });
            await expectHttpException(controller.get(ctx), 404, "User not found");
        });

        it("returns the public user on success", async () => {
            const ctx = createMockContext({ params: { id: "user-1" } });
            const result: any = await controller.get(ctx);
            expect(userService.getById).toHaveBeenCalledWith("user-1");
            expect(result.status).toBe(200);
            expect(result.body).not.toHaveProperty("password_hash");
        });
    });

    describe("getOrganizations", () => {
        it("400s when the id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getOrganizations(ctx), 400, "userId");
        });

        it("maps membership rows into a flattened response", async () => {
            (organizationUserService.getOrganizationsByUser as any).mockImplementationOnce(async () => [
                {
                    organization: { id: "org-1", name: "Acme", normalized_name: "acme", description: null },
                    membership: { id: "member-1", role: "admin", created_at: new Date(), updated_at: null },
                },
            ]);

            const ctx = createMockContext({ params: { id: "user-1" }, query: { limit: "5", offset: "0" } });
            const result: any = await controller.getOrganizations(ctx);

            expect(organizationUserService.getOrganizationsByUser).toHaveBeenCalledWith("user-1", { limit: 5, offset: 0 });
            expect(result.body).toEqual([
                {
                    id: "member-1",
                    organization_id: "org-1",
                    role: "admin",
                    name: "Acme",
                    normalized_name: "acme",
                    description: null,
                    created_at: expect.any(Date),
                    updated_at: null,
                },
            ]);
        });
    });

    describe("update", () => {
        it("400s when the id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.update(ctx), 400, "userId");
        });

        it("404s when the user doesn't exist", async () => {
            (userService.update as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { id: "missing" }, body: { first_name: "New" } });
            await expectHttpException(controller.update(ctx), 404, "User not found");
        });

        it("updates and returns the public user", async () => {
            const ctx = createMockContext({ params: { id: "user-1" }, body: { first_name: "New" } });
            const result: any = await controller.update(ctx);
            expect(userService.update).toHaveBeenCalledWith("user-1", { first_name: "New" });
            expect(result.status).toBe(200);
        });
    });

    describe("delete", () => {
        it("400s when the id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.delete(ctx), 400, "userId");
        });

        it("404s when the user doesn't exist", async () => {
            (userService.delete as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { id: "missing" } });
            await expectHttpException(controller.delete(ctx), 404, "User not found");
        });

        it("deletes and returns the public user", async () => {
            const ctx = createMockContext({ params: { id: "user-1" } });
            const result: any = await controller.delete(ctx);
            expect(userService.delete).toHaveBeenCalledWith("user-1");
            expect(result.status).toBe(200);
        });
    });
});
