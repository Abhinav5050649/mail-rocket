import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { config } from "../../config";
import { addTracking, signTrackingLink } from "../../src/libs";

describe("addTracking", () => {
    beforeEach(() => {
        config.publicApiUrl = "https://api.example.com";
        config.trackingSecret = "test-secret";
    });

    afterEach(() => {
        config.publicApiUrl = "";
        config.trackingSecret = "";
    });

    it("leaves the html untouched while tracking is off", () => {
        config.publicApiUrl = "";
        const html = `<body><a href="https://example.com">Go</a></body>`;
        expect(addTracking(html, "cs-1")).toBe(html);
    });

    it("routes absolute links through /track/click with a signature for the unescaped url", () => {
        const html = addTracking(`<a href="https://example.com/?a=1&amp;b=2">Go</a>`, "cs-1");
        const url = "https://example.com/?a=1&b=2";
        const sig = signTrackingLink("cs-1", url);

        expect(html).toContain(`href="https://api.example.com/track/click/cs-1?url=${encodeURIComponent(url)}&amp;sig=${sig}"`);
    });

    it("leaves mailto and relative links alone", () => {
        const html = addTracking(`<a href="mailto:a@b.c">Mail</a><a href='/x'>X</a>`, "cs-1");
        expect(html).toContain(`href="mailto:a@b.c"`);
        expect(html).toContain(`href='/x'`);
    });

    it("puts the open pixel before </body>, or at the end when there's no body tag", () => {
        const pixel = `<img src="https://api.example.com/track/open/cs-1"`;
        expect(addTracking("<html><body>Hi</body></html>", "cs-1")).toMatch(new RegExp(`${pixel}[^>]*></body></html>$`));
        expect(addTracking("Hi", "cs-1")).toStartWith(`Hi${pixel}`);
    });
});
