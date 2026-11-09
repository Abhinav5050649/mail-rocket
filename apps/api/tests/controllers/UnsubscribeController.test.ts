import { describe, it, expect, mock, beforeEach } from "bun:test";
import { UnsubscribeController } from "../../src/controllers";
import type { OrganizationService, SubscriberService } from "../../src/services";
import { createMockContext } from "../helpers/mockContext";

describe("UnsubscribeController", () => {
    let subscriberService: SubscriberService;
    let organizationService: OrganizationService;
    let controller: UnsubscribeController;

    const subscriber = { id: "subscriber-1", email_id: "ada@example.com", unsubscribed_at: null };

    beforeEach(() => {
        subscriberService = {
            getByDelivery: mock(async () => subscriber),
            unsubscribe: mock(async () => ({ ...subscriber, unsubscribed_at: new Date() })),
        } as unknown as SubscriberService;
        organizationService = { get: mock(async () => ({ name: "Acme <Inc>" })) } as unknown as OrganizationService;
        controller = new UnsubscribeController(subscriberService, organizationService);
    });

    describe("confirm", () => {
        it("shows an Unsubscribe button without unsubscribing, naming the escaped sender", async () => {
            const result: any = await controller.confirm(createMockContext({ params: { delivery_id: "d-1" } }));

            expect(subscriberService.getByDelivery).toHaveBeenCalledWith("d-1");
            expect(subscriberService.unsubscribe).not.toHaveBeenCalled();
            expect(result.body).toContain(`<form method="post"`);
            expect(result.body).toContain("Acme &#60;Inc&#62;");
        });

        it("says so when the subscriber already unsubscribed", async () => {
            (subscriberService.getByDelivery as any).mockImplementationOnce(async () => ({ ...subscriber, unsubscribed_at: new Date() }));
            const result: any = await controller.confirm(createMockContext({ params: { delivery_id: "d-1" } }));

            expect(result.body).toContain("You're unsubscribed");
            expect(result.body).not.toContain("<form");
        });

        it("404s a link that matches no email", async () => {
            (subscriberService.getByDelivery as any).mockImplementationOnce(async () => null);
            const result: any = await controller.confirm(createMockContext({ params: { delivery_id: "missing" } }));

            expect(result.status).toBe(404);
        });
    });

    describe("unsubscribe", () => {
        it("unsubscribes the email's subscriber", async () => {
            const result: any = await controller.unsubscribe(createMockContext({ params: { delivery_id: "d-1" } }));

            expect(subscriberService.unsubscribe).toHaveBeenCalledWith("d-1");
            expect(result.status).toBe(200);
            expect(result.body).toContain("You're unsubscribed");
        });

        it("404s a link that matches no email", async () => {
            (subscriberService.unsubscribe as any).mockImplementationOnce(async () => null);
            const result: any = await controller.unsubscribe(createMockContext({ params: { delivery_id: "missing" } }));

            expect(result.status).toBe(404);
        });
    });
});
