import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AuthController } from "../../src/controllers";
import type { AuthService } from "../../src/services";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("AuthController", () => {
    let authService: AuthService;
    let controller: AuthController;

    const authResult = {
        user: { id: "user-1", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
        token: "signed.jwt.token",
    };

    beforeEach(() => {
        authService = {
            signup: mock(async () => authResult),
            signin: mock(async () => authResult),
        } as unknown as AuthService;

        controller = new AuthController(authService);
    });

    describe("signup", () => {
        it("400s when email or password is missing", async () => {
            const ctx = createMockContext({ body: { email: "ada@example.com" } });
            await expectHttpException(controller.signup(ctx), 400, "Missing Parameters");
        });

        it("400s on an invalid email format", async () => {
            const ctx = createMockContext({ body: { email: "not-an-email", password: "password123" } });
            await expectHttpException(controller.signup(ctx), 400, "Invalid email format");
        });

        it("400s when the password is too short", async () => {
            const ctx = createMockContext({ body: { email: "ada@example.com", password: "short" } });
            await expectHttpException(controller.signup(ctx), 400, "at least 8 characters");
        });

        it("409s when the email is already registered", async () => {
            (authService.signup as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ body: { email: "ada@example.com", password: "password123" } });
            await expectHttpException(controller.signup(ctx), 409, "already registered");
        });

        it("creates credentials and returns the user + token", async () => {
            const ctx = createMockContext({ body: { email: "ada@example.com", password: "password123", first_name: "Ada" } });
            const result: any = await controller.signup(ctx);

            expect(authService.signup).toHaveBeenCalledWith({ email: "ada@example.com", password: "password123", first_name: "Ada", last_name: undefined });
            expect(result.status).toBe(201);
            expect(result.body).toEqual(authResult);
        });
    });

    describe("signin", () => {
        it("400s when email or password is missing", async () => {
            const ctx = createMockContext({ body: { email: "ada@example.com" } });
            await expectHttpException(controller.signin(ctx), 400, "Missing Parameters");
        });

        it("401s on invalid credentials", async () => {
            (authService.signin as any).mockImplementationOnce(async () => null);
            const ctx = createMockContext({ body: { email: "ada@example.com", password: "wrong-password" } });
            await expectHttpException(controller.signin(ctx), 401, "Invalid email or password");
        });

        it("verifies credentials and returns the user + token", async () => {
            const ctx = createMockContext({ body: { email: "ada@example.com", password: "password123" } });
            const result: any = await controller.signin(ctx);

            expect(authService.signin).toHaveBeenCalledWith({ email: "ada@example.com", password: "password123" });
            expect(result.status).toBe(200);
            expect(result.body).toEqual(authResult);
        });
    });
});
