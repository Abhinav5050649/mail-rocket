import { describe, it, expect, mock, beforeEach } from "bun:test";
import { OrganizationUserController } from "../../src/controllers";
import type { UserService, OrganizationUserService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("OrganizationUserController", () => {
    let userService: UserService;
    let organizationUserService: OrganizationUserService;
    let controller: OrganizationUserController;

    const createdUser = { id: "user-2", email: "new@example.com", first_name: "New", last_name: "Member", password_hash: null, description: null, normalized_name: null };
    const membership = { id: "member-1", organization_id: "org-1", user_id: "user-2", role: "viewer", created_at: new Date(), updated_at: null };

    beforeEach(() => {
        userService = {
            create: mock(async () => createdUser),
        } as unknown as UserService;

        organizationUserService = {
            getUsersByOrganization: mock(async () => []),
            create: mock(async () => membership),
            getByOrganizationAndUser: mock(async () => membership),
            update: mock(async () => ({ ...membership, role: "editor" })),
            delete: mock(async () => membership),
        } as unknown as OrganizationUserService;

        controller = new OrganizationUserController(userService, organizationUserService);
    });

    describe("getAll", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {} });
            await expectHttpException(controller.getAll(ctx), 400, "organizationId");
        });

        it("maps membership rows into a flattened member list", async () => {
            (organizationUserService.getUsersByOrganization as any).mockImplementationOnce(async () => [
                {
                    user: { id: "user-2", first_name: "New", last_name: "Member", normalized_name: null, description: null },
                    membership: { id: "member-1", organization_id: "org-1", role: "viewer", created_at: new Date(), updated_at: null },
                },
            ]);

            const ctx = createMockContext({ params: { organization_id: "org-1" } });
            const result: any = await controller.getAll(ctx);

            expect(result.body).toEqual([
                {
                    id: "member-1",
                    user_id: "user-2",
                    organization_id: "org-1",
                    role: "viewer",
                    first_name: "New",
                    last_name: "Member",
                    normalized_name: null,
                    description: null,
                    created_at: expect.any(Date),
                    updated_at: null,
                },
            ]);
        });
    });

    describe("post", () => {
        it("400s when the organization_id param is missing", async () => {
            const ctx = createMockContext({ params: {}, body: {} });
            await expectHttpException(controller.post(ctx), 400, "organizationId");
        });

        it("creates a user and adds them to the organization", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: { email: "new@example.com", role: "viewer" } });
            const result: any = await controller.post(ctx);

            expect(userService.create).toHaveBeenCalledWith({ email: "new@example.com" });
            expect(organizationUserService.create).toHaveBeenCalledWith({ organization_id: "org-1", user_id: "user-2", role: "viewer" });
            expect(result.status).toBe(201);
            expect(result.body).toMatchObject({ email: "new@example.com", organization_id: "org-1", role: "viewer", membership_id: "member-1" });
            expect(result.body).not.toHaveProperty("password_hash");
        });
    });

    describe("update", () => {
        it("400s when a route param is missing", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" }, body: {} });
            await expectHttpException(controller.update(ctx), 400, "userId");
        });

        it("404s when the user isn't a member of the organization", async () => {
            (organizationUserService.getByOrganizationAndUser as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { organization_id: "org-1", user_id: "user-2" }, body: { role: "editor" } });
            await expectHttpException(controller.update(ctx), 404, "Membership not found");
        });

        it("updates the membership role", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1", user_id: "user-2" }, body: { role: "editor" } });
            const result: any = await controller.update(ctx);

            expect(organizationUserService.update).toHaveBeenCalledWith("member-1", { role: "editor" });
            expect(result.body.role).toBe("editor");
        });
    });

    describe("delete", () => {
        it("400s when a route param is missing", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1" } });
            await expectHttpException(controller.delete(ctx), 400, "userId");
        });

        it("404s when the user isn't a member of the organization", async () => {
            (organizationUserService.getByOrganizationAndUser as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ params: { organization_id: "org-1", user_id: "user-2" } });
            await expectHttpException(controller.delete(ctx), 404, "Membership not found");
        });

        it("removes the membership", async () => {
            const ctx = createMockContext({ params: { organization_id: "org-1", user_id: "user-2" } });
            const result: any = await controller.delete(ctx);

            expect(organizationUserService.delete).toHaveBeenCalledWith("member-1");
            expect(result.body).toEqual(membership);
        });
    });
});
