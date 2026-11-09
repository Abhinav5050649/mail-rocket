import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { config } from "../../config";
import { TrackingController } from "../../src/controllers";
import type { TrackingService } from "../../src/services";
import { signTrackingLink } from "../../src/libs";
import { createMockContext, expectHttpException } from "../helpers/mockContext";

describe("TrackingController", () => {
    let trackingService: TrackingService;
    let controller: TrackingController;

    const url = "https://example.com/offer?a=1&b=2";

    beforeEach(() => {
        config.trackingSecret = "test-secret";
        trackingService = { record: mock(async () => {}) } as unknown as TrackingService;
        controller = new TrackingController(trackingService);
    });

    afterEach(() => {
        config.trackingSecret = "";
    });

    describe("open", () => {
        it("records an open and returns an uncached GIF", async () => {
            const ctx = createMockContext({ params: { delivery_id: "cs-1" } });
            const result: any = await controller.open(ctx);

            expect(trackingService.record).toHaveBeenCalledWith("cs-1", "open");
            expect(result.headers).toEqual({ "Content-Type": "image/gif", "Cache-Control": "no-store" });
        });
    });

    describe("click", () => {
        it("records a click and redirects to a correctly signed url", async () => {
            const ctx = createMockContext({ params: { delivery_id: "cs-1" }, query: { url, sig: signTrackingLink("cs-1", url) } });
            const result: any = await controller.click(ctx);

            expect(trackingService.record).toHaveBeenCalledWith("cs-1", "click");
            expect(result).toEqual({ location: url, status: 302 });
        });

        it("400s a url signed for another subscriber, without recording", async () => {
            const ctx = createMockContext({ params: { delivery_id: "cs-1" }, query: { url, sig: signTrackingLink("cs-2", url) } });
            await expectHttpException(controller.click(ctx), 400, "Invalid tracking link");
            expect(trackingService.record).not.toHaveBeenCalled();
        });

        it("400s every link while tracking is off", async () => {
            const sig = signTrackingLink("cs-1", url);
            config.trackingSecret = "";
            const ctx = createMockContext({ params: { delivery_id: "cs-1" }, query: { url, sig } });
            await expectHttpException(controller.click(ctx), 400, "Invalid tracking link");
        });
    });
});
